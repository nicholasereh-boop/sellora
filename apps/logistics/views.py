"""
Thin views over apps.logistics.services (see that module's docstring:
"only apps.sellers ... and apps.riders ... touch this app, and only
through apps.logistics.services"). No business logic lives here -
every state change is delegated to the matching services function,
which is also what keeps this file free of duplicate rules already
enforced there (e.g. "can't accept an already-assigned task").
"""

from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

from apps.core.exceptions import ValidationFailedError
from apps.core.idempotency import idempotent_post, user_action_key

from . import services
from .models import DeliveryTask, PickupTask, PickupTaskStatus, SellerFulfillment
from .permissions import approved_rider_required, approved_seller_required


# ---------------------------------------------------------------------------
# Rider - pickup tasks
# ---------------------------------------------------------------------------

@approved_rider_required
def rider_pickup_task_list_view(request):
    profile = request.user.rider_profile

    my_tasks = (
        PickupTask.objects.filter(rider=profile)
        .exclude(status__in=[PickupTaskStatus.COLLECTED, PickupTaskStatus.CANCELLED])
        .select_related("package__fulfillment__seller", "package__fulfillment__order")
        .order_by("-created_at")
    )

    # Every approved rider currently sees every unassigned task - no
    # service-area/vehicle matching yet (see apps.logistics.services docstring).
    available_tasks = (
        PickupTask.objects.filter(rider__isnull=True, status=PickupTaskStatus.PENDING)
        .select_related("package__fulfillment__seller", "package__fulfillment__order")
        .order_by("-created_at")
    )

    return render(
        request,
        "logistics/rider_pickup_task_list.html",
        {"my_tasks": my_tasks, "available_tasks": available_tasks},
    )


@approved_rider_required
def rider_accept_pickup_task_view(request, task_id):
    profile = request.user.rider_profile
    task = get_object_or_404(PickupTask, pk=task_id)

    if request.method == "POST":
        try:
            services.assign_rider_to_pickup_task(task, profile)
            messages.success(request, "Task accepted.")
        except ValidationFailedError as exc:
            messages.error(request, str(exc))

    return redirect("logistics:rider_pickup_task_list")


@approved_rider_required
@idempotent_post(user_action_key, message="This pickup is already being confirmed.")
def rider_mark_collected_view(request, task_id):
    profile = request.user.rider_profile
    task = get_object_or_404(PickupTask, pk=task_id, rider=profile)

    if request.method == "POST":
        try:
            services.mark_package_collected(task)
            messages.success(request, "Package marked collected.")
        except ValidationFailedError as exc:
            messages.error(request, str(exc))

    return redirect("logistics:rider_pickup_task_list")


@approved_rider_required
def rider_report_exception_view(request, task_id):
    profile = request.user.rider_profile
    task = get_object_or_404(PickupTask, pk=task_id, rider=profile)

    if request.method == "POST":
        missing = request.POST.get("missing") == "1"
        reason = request.POST.get("reason", "")
        services.report_pickup_exception(task, missing=missing, reason=reason)
        messages.success(request, "Issue reported.")

    return redirect("logistics:rider_pickup_task_list")


# ---------------------------------------------------------------------------
# Rider - delivery tasks
# ---------------------------------------------------------------------------

@approved_rider_required
def rider_delivery_task_list_view(request):
    profile = request.user.rider_profile
    tasks = (
        DeliveryTask.objects.filter(rider=profile)
        .select_related("delivery__order")
        .order_by("-created_at")
    )
    return render(request, "logistics/rider_delivery_task_list.html", {"tasks": tasks})


@approved_rider_required
@idempotent_post(user_action_key, message="This delivery is already being confirmed.")
def rider_mark_delivered_view(request, task_id):
    profile = request.user.rider_profile
    task = get_object_or_404(DeliveryTask, pk=task_id, rider=profile)

    if request.method == "POST":
        try:
            services.mark_delivery_task_delivered(task)
            messages.success(request, "Delivery marked complete.")
        except ValidationFailedError as exc:
            messages.error(request, str(exc))

    return redirect("logistics:rider_delivery_task_list")


# ---------------------------------------------------------------------------
# Seller - fulfillment / pickup readiness
# ---------------------------------------------------------------------------

@approved_seller_required
def seller_fulfillment_list_view(request):
    profile = request.user.seller_profile
    fulfillments = (
        SellerFulfillment.objects.filter(seller=profile)
        .select_related("order")
        .prefetch_related("packages")
        .order_by("-created_at")
    )
    return render(
        request,
        "logistics/seller_fulfillment_list.html",
        {"profile": profile, "fulfillments": fulfillments},
    )


@approved_seller_required
def mark_fulfillment_ready_view(request, fulfillment_id):
    profile = request.user.seller_profile
    fulfillment = get_object_or_404(SellerFulfillment, pk=fulfillment_id, seller=profile)

    if request.method == "POST":
        try:
            services.mark_fulfillment_ready(fulfillment)
            messages.success(request, "Marked ready for pickup.")
        except ValidationFailedError as exc:
            messages.error(request, str(exc))

    return redirect("logistics:seller_fulfillment_list")
