"""
Rider portal API (roadmap Phase 11).

Every view mirrors apps.riders.views's own logic exactly (same
querysets, same _active_leg selection, same service calls) - this is a
second delivery mechanism for the same business logic, never a second
implementation of it. Task actions (accept, mark collected, report
exception, mark delivered) are NOT here - those belong to Phase 12
(logistics) and apps.logistics.services remains their sole owner.
"""
from django.core.paginator import Paginator
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import ValidationFailedError
from apps.kyc.services import kyc_confirmed, kyc_status_for
from apps.logistics.models import DeliveryTask, DeliveryTaskStatus, PickupTask, PickupTaskStatus

from ..forms import RiderApplicationForm, RiderBankDetailsForm, RiderProfileForm
from ..models import RiderStatus
from ..services import apply_for_rider, set_rider_availability
from .serializers import (
    DeliveryTaskSerializer,
    PickupTaskSerializer,
    RiderBankDetailsSerializer,
    RiderEarningSerializer,
    RiderProfileSerializer,
)

_ACTIVE_PICKUP_STATUSES = (PickupTaskStatus.ASSIGNED, PickupTaskStatus.EN_ROUTE)
_ACTIVE_DELIVERY_STATUSES = (DeliveryTaskStatus.ASSIGNED, DeliveryTaskStatus.EN_ROUTE)
_TERMINAL_DELIVERY_STATUSES = (DeliveryTaskStatus.DELIVERED, DeliveryTaskStatus.FAILED, DeliveryTaskStatus.CANCELLED)

STEPS = ["Assigned", "Picked Up", "In Transit", "Delivered"]


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


def _form_errors(form):
    return {field: [str(e) for e in errs] for field, errs in form.errors.items()}


def _require_approved_rider(request):
    """Same gate as apps.riders.permissions.approved_rider_required, as
    a function returning a DRF Response (or None) instead of redirecting."""
    profile = getattr(request.user, "rider_profile", None)
    if profile is None:
        return None, _err("NOT_A_RIDER", "You need to apply as a rider first.",
                           status.HTTP_403_FORBIDDEN)
    if profile.status != RiderStatus.APPROVED:
        return None, _err(
            "RIDER_NOT_APPROVED",
            f"Your rider application is currently {profile.get_status_display().lower()}.",
            status.HTTP_403_FORBIDDEN,
        )
    return profile, None


def _active_leg(profile):
    """Identical selection to apps.riders.views._active_leg."""
    delivery = (
        DeliveryTask.objects.filter(rider=profile, status__in=_ACTIVE_DELIVERY_STATUSES)
        .select_related("delivery__order__shipping_address")
        .order_by("-created_at")
        .first()
    )
    if delivery is not None:
        return "delivery", delivery

    pickup = (
        PickupTask.objects.filter(rider=profile, status__in=_ACTIVE_PICKUP_STATUSES)
        .select_related("package__fulfillment__seller", "package__fulfillment__order")
        .order_by("-created_at")
        .first()
    )
    if pickup is not None:
        return "pickup", pickup

    return None, None


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def application_view(request):
    """GET/POST /api/riders/application/ - current application, or null.
    No resubmission path (matches apps.riders.services.apply_for_rider -
    one profile per user, ever)."""
    existing = getattr(request.user, "rider_profile", None)

    if request.method == "GET":
        if existing is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": RiderProfileSerializer(existing).data})

    if existing is not None:
        return _err("ALREADY_APPLIED", "You already have a rider application on file.",
                     status.HTTP_400_BAD_REQUEST)

    form = RiderApplicationForm(request.data)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        profile = apply_for_rider(user=request.user, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": RiderProfileSerializer(profile).data},
                     status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Dashboard / availability
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """GET /api/riders/dashboard/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    leg_type, active_task = _active_leg(profile)
    today = timezone.localdate()

    return Response({"success": True, "data": {
        "profile": RiderProfileSerializer(profile).data,
        "has_active_task": active_task is not None,
        "active_task_type": leg_type,
        "completed_today": DeliveryTask.objects.filter(
            rider=profile, status=DeliveryTaskStatus.DELIVERED, delivered_at__date=today,
        ).count(),
        "total_completed": DeliveryTask.objects.filter(
            rider=profile, status=DeliveryTaskStatus.DELIVERED,
        ).count(),
        "todays_earnings": profile.earnings.filter(
            reversal_of__isnull=True, created_at__date=today,
        ).aggregate(total=models.Sum("amount"))["total"] or 0,
        "available_balance": profile.available_earnings,
        "pending_earnings": profile.pending_earnings,
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_availability_view(request):
    """POST /api/riders/availability/ - flips the rider's on-shift toggle."""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    try:
        set_rider_availability(profile=profile, available=not profile.is_available)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": {"is_available": profile.is_available}})


# ---------------------------------------------------------------------------
# Active delivery
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_delivery_view(request):
    """
    GET /api/riders/active-delivery/

    Read-only: shows whichever leg (pickup or delivery) this rider
    currently holds open, with the same 4-step progression the template
    view computes. The actions themselves (mark collected, report
    exception, mark delivered) are Phase 12 (logistics), not here.
    """
    profile, error = _require_approved_rider(request)
    if error:
        return error

    leg_type, task = _active_leg(profile)
    if task is None:
        return Response({"success": True, "data": None})

    if leg_type == "pickup":
        fulfillment = task.package.fulfillment
        reference = fulfillment.order.reference
        contact = {"label": "Pickup from", "name": fulfillment.seller.store_name, "phone": fulfillment.seller.phone}
        step_index = 1 if task.status == PickupTaskStatus.COLLECTED else 0
        task_data = PickupTaskSerializer(task).data
    else:
        order = task.delivery.order
        reference = order.reference
        contact = {"label": "Deliver to", "name": order.full_name, "phone": order.phone}
        step_index = {
            DeliveryTaskStatus.ASSIGNED: 1,
            DeliveryTaskStatus.EN_ROUTE: 2,
            DeliveryTaskStatus.DELIVERED: 3,
        }.get(task.status, 1)
        task_data = DeliveryTaskSerializer(task).data

    return Response({"success": True, "data": {
        "leg_type": leg_type,
        "task": task_data,
        "reference": reference,
        "contact": contact,
        "steps": STEPS,
        "step_index": step_index,
    }})


# ---------------------------------------------------------------------------
# Activity (completed/failed/cancelled deliveries)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_view(request):
    """GET /api/riders/activity/?status=...&page=..."""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    tasks = (
        DeliveryTask.objects.filter(rider=profile, status__in=_TERMINAL_DELIVERY_STATUSES)
        .select_related("delivery__order")
        .order_by("-created_at")
    )

    status_filter = request.query_params.get("status")
    if status_filter in DeliveryTaskStatus.values:
        tasks = tasks.filter(status=status_filter)

    paginator = Paginator(tasks, 20)
    page_obj = paginator.get_page(request.query_params.get("page"))

    return Response({"success": True, "data": {
        "results": DeliveryTaskSerializer(page_obj.object_list, many=True).data,
        "count": paginator.count,
        "num_pages": paginator.num_pages,
        "page": page_obj.number,
    }})


# ---------------------------------------------------------------------------
# Profile / bank details
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """GET/PATCH /api/riders/profile/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    if request.method == "GET":
        return Response({"success": True, "data": RiderProfileSerializer(profile).data})

    form = RiderProfileForm(request.data, instance=profile)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    return Response({"success": True, "data": RiderProfileSerializer(profile).data})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def bank_details_view(request):
    """GET/PATCH /api/riders/bank-details/"""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    if request.method == "GET":
        return Response({"success": True, "data": RiderBankDetailsSerializer(profile).data})

    form = RiderBankDetailsForm(request.data, instance=profile)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    return Response({"success": True, "data": RiderBankDetailsSerializer(profile).data})


# ---------------------------------------------------------------------------
# Earnings
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def earnings_view(request):
    """GET /api/riders/earnings/?status=...&page=..."""
    profile, error = _require_approved_rider(request)
    if error:
        return error

    earnings = profile.earnings.filter(reversal_of__isnull=True).select_related("order").order_by("-created_at")

    status_filter = request.query_params.get("status")
    if status_filter:
        earnings = earnings.filter(status=status_filter)

    paginator = Paginator(earnings, 20)
    page_obj = paginator.get_page(request.query_params.get("page"))

    return Response({"success": True, "data": {
        "results": RiderEarningSerializer(page_obj.object_list, many=True).data,
        "count": paginator.count,
        "num_pages": paginator.num_pages,
        "page": page_obj.number,
        "available_balance": profile.available_earnings,
        "pending_earnings": profile.pending_earnings,
        "paid_earnings": profile.paid_earnings,
        "kyc_status": kyc_status_for(rider=profile)[0],
        "kyc_status_label": kyc_status_for(rider=profile)[1],
        "can_withdraw": kyc_confirmed(rider=profile),
    }})
