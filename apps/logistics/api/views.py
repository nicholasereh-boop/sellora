"""
Logistics API (roadmap Phase 12).

Every view delegates to apps.logistics.services exactly like
apps.logistics.views does - "no business logic lives here" holds here
too. This is what finally makes the rider active-delivery view
(Phase 11) actionable, and gives sellers a "mark ready" action.

Ownership checks mirror the template views: a rider can only act on
their own tasks (or an unassigned one, for accept); a seller can only
mark their own fulfillment ready.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import ValidationFailedError
from apps.core.idempotency import idempotent_post, user_action_key
from apps.riders.api.serializers import DeliveryTaskSerializer, PickupTaskSerializer
from apps.riders.models import RiderStatus
from apps.sellers.models import SellerStatus

from .. import services
from ..models import DeliveryTask, PickupTask, PickupTaskStatus, SellerFulfillment
from .serializers import SellerFulfillmentSerializer


def _err(code, message, http_status):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=http_status)


def _require_approved_rider(request):
    profile = getattr(request.user, "rider_profile", None)
    if profile is None or profile.status != RiderStatus.APPROVED:
        return None, _err("NOT_APPROVED", "You need to be an approved rider to do this.",
                           status.HTTP_403_FORBIDDEN)
    return profile, None


def _require_approved_seller(request):
    profile = getattr(request.user, "seller_profile", None)
    if profile is None or profile.status != SellerStatus.APPROVED:
        return None, _err("NOT_APPROVED", "You need to be an approved seller to do this.",
                           status.HTTP_403_FORBIDDEN)
    return profile, None


# ---------------------------------------------------------------------------
# Rider - pickup tasks
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pickup_task_list_view(request):
    """GET /api/logistics/pickup-tasks/ - mine + available, same querysets as the template view."""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    my_tasks = (
        PickupTask.objects.filter(rider=profile)
        .exclude(status__in=[PickupTaskStatus.COLLECTED, PickupTaskStatus.CANCELLED])
        .select_related("package__fulfillment__seller", "package__fulfillment__order")
        .order_by("-created_at")
    )
    available_tasks = (
        PickupTask.objects.filter(rider__isnull=True, status=PickupTaskStatus.PENDING)
        .select_related("package__fulfillment__seller", "package__fulfillment__order")
        .order_by("-created_at")
    )

    return Response({"success": True, "data": {
        "my_tasks": PickupTaskSerializer(my_tasks, many=True).data,
        "available_tasks": PickupTaskSerializer(available_tasks, many=True).data,
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_pickup_task_view(request, task_id):
    """POST /api/logistics/pickup-tasks/{task_id}/accept/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    task = get_object_or_404(PickupTask, pk=task_id)
    try:
        services.assign_rider_to_pickup_task(task, profile)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": PickupTaskSerializer(task).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@idempotent_post(user_action_key, message="This pickup is already being confirmed.")
def mark_collected_view(request, task_id):
    """POST /api/logistics/pickup-tasks/{task_id}/collect/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    task = get_object_or_404(PickupTask, pk=task_id, rider=profile)
    try:
        services.mark_package_collected(task)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": PickupTaskSerializer(task).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_pickup_exception_view(request, task_id):
    """POST /api/logistics/pickup-tasks/{task_id}/exception/ - body: {missing, reason}"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    task = get_object_or_404(PickupTask, pk=task_id, rider=profile)
    missing = bool(request.data.get("missing"))
    reason = (request.data.get("reason") or "").strip()
    if not reason:
        return _err("VALIDATION_ERROR", "Please describe the issue.", status.HTTP_400_BAD_REQUEST)

    services.report_pickup_exception(task, missing=missing, reason=reason)
    return Response({"success": True, "data": PickupTaskSerializer(task).data})


# ---------------------------------------------------------------------------
# Rider - delivery tasks
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def delivery_task_list_view(request):
    """GET /api/logistics/delivery-tasks/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    tasks = (
        DeliveryTask.objects.filter(rider=profile)
        .select_related("delivery__order")
        .order_by("-created_at")
    )
    return Response({"success": True, "data": DeliveryTaskSerializer(tasks, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@idempotent_post(user_action_key, message="This delivery is already being confirmed.")
def mark_delivered_view(request, task_id):
    """POST /api/logistics/delivery-tasks/{task_id}/deliver/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    task = get_object_or_404(DeliveryTask, pk=task_id, rider=profile)
    try:
        services.mark_delivery_task_delivered(task)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": DeliveryTaskSerializer(task).data})


# ---------------------------------------------------------------------------
# Seller - fulfillment / pickup readiness
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fulfillment_list_view(request):
    """GET /api/logistics/fulfillments/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    fulfillments = (
        SellerFulfillment.objects.filter(seller=profile)
        .select_related("order")
        .prefetch_related("packages")
        .order_by("-created_at")
    )
    return Response({"success": True, "data": SellerFulfillmentSerializer(fulfillments, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_fulfillment_ready_view(request, fulfillment_id):
    """POST /api/logistics/fulfillments/{fulfillment_id}/ready/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    fulfillment = get_object_or_404(SellerFulfillment, pk=fulfillment_id, seller=profile)
    try:
        services.mark_fulfillment_ready(fulfillment)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": SellerFulfillmentSerializer(fulfillment).data})
