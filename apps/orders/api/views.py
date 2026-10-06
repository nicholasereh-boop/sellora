"""
Orders + checkout API (roadmap Phase 7).

Every view here is a thin wrapper: it calls the exact same
apps.orders.services functions the Django-template checkout/order views
call, so there is exactly one implementation of "what a buyer owes" and
"how an order is built from a cart" - never a second, React-only copy.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.affiliates.services import get_attributed_affiliate
from apps.cart.services import get_or_create_cart
from apps.core.enums import DeliveryMethod, RefundReasonCategory
from apps.core.exceptions import ValidationFailedError

from ..forms import CheckoutForm
from ..models import Order, OrderItem
from ..services import build_order_tracking, create_order_from_cart, request_refund
from ..services.checkout import build_checkout_summary, validate_cart_stock
from .serializers import OrderDetailSerializer, OrderListSerializer


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def checkout_summary_view(request):
    """GET /api/checkout/?delivery_method=shipping|local_delivery"""
    cart = get_or_create_cart(request)
    if not cart.items.exists():
        return _err("EMPTY_CART", "Your cart is empty.", status.HTTP_400_BAD_REQUEST)

    delivery_method = request.query_params.get("delivery_method", DeliveryMethod.SHIPPING)
    if delivery_method not in DeliveryMethod.values:
        return _err("VALIDATION_ERROR", "Invalid delivery method.", status.HTTP_400_BAD_REQUEST)

    try:
        validate_cart_stock(cart)
    except ValidationFailedError as e:
        return _err("OUT_OF_STOCK", str(e), status.HTTP_400_BAD_REQUEST)

    summary = build_checkout_summary(cart, delivery_method)
    return Response({"success": True, "data": summary})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_checkout_view(request):
    """
    POST /api/orders/checkout/

    Body matches apps.orders.forms.CheckoutForm's fields exactly - same
    form, same validation, same create_order_from_cart() call the
    Django-template checkout view uses.
    """
    cart = get_or_create_cart(request)
    if not cart.items.exists():
        return _err("EMPTY_CART", "Your cart is empty.", status.HTTP_400_BAD_REQUEST)

    form = CheckoutForm(request.data)
    if not form.is_valid():
        fields = {f: [str(e) for e in errs] for f, errs in form.errors.items()}
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, fields)

    try:
        order = create_order_from_cart(
            user=request.user,
            cart=cart,
            email=form.cleaned_data["email"],
            full_name=form.cleaned_data["full_name"],
            phone=form.cleaned_data["phone"],
            delivery_method=form.cleaned_data["delivery_method"],
            shipping_data=form.shipping_data(),
            affiliate=get_attributed_affiliate(request),
        )
    except ValidationFailedError as e:
        return _err("OUT_OF_STOCK", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({
        "success": True,
        "data": {"reference": order.reference},
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_list_view(request):
    """GET /api/orders/"""
    orders = Order.objects.filter(user=request.user).order_by("-created_at")
    return Response({"success": True, "data": OrderListSerializer(orders, many=True).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail_view(request, reference):
    """GET /api/orders/{reference}/"""
    order = get_object_or_404(Order, reference=reference, user=request.user)
    data = OrderDetailSerializer(order).data
    data["seller_tracking"] = build_order_tracking(order)
    return Response({"success": True, "data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_status_view(request, reference):
    """GET /api/orders/{reference}/status/ - lightweight polling endpoint."""
    order = get_object_or_404(Order, reference=reference, user=request.user)
    delivery = getattr(order, "delivery", None)
    return Response({"success": True, "data": {
        "status": order.status,
        "status_label": order.get_status_display(),
        "delivery_stage": delivery.current_stage if delivery else None,
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_refund_view(request, reference, item_id):
    """POST /api/orders/{reference}/items/{item_id}/refund/"""
    order = get_object_or_404(Order, reference=reference, user=request.user)
    item = get_object_or_404(OrderItem, pk=item_id, order=order)

    reason = (request.data.get("reason") or "").strip()
    reason_category = request.data.get("reason_category", "")

    if reason_category not in RefundReasonCategory.values:
        return _err("VALIDATION_ERROR", "Please choose a reason.", status.HTTP_400_BAD_REQUEST)
    if not reason:
        return _err("VALIDATION_ERROR", "Please describe the issue before submitting.",
                     status.HTTP_400_BAD_REQUEST)

    try:
        refund = request_refund(
            order_item=item,
            user=request.user,
            reason=reason,
            reason_category=reason_category,
            evidence_files=request.FILES.getlist("evidence"),
        )
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": {
        "status": refund.status,
        "status_label": refund.get_status_display(),
    }})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_product_view(request, reference, item_id):
    """
    GET /api/orders/{reference}/download/{item_id}/

    Same ownership/paid/digital checks as the template view. Returns the
    URL of the existing file-streaming view rather than reimplementing
    raw-file HttpResponse handling under DRF - one implementation of the
    actual byte-streaming, matching the migration's reuse principle.
    """
    order = get_object_or_404(Order, reference=reference, user=request.user)
    if not order.is_paid:
        return _err("NOT_PAID", "This order hasn't been paid for yet.", status.HTTP_400_BAD_REQUEST)

    item = get_object_or_404(OrderItem, pk=item_id, order=order)
    if item.product is None or not item.product.is_digital or not item.product.digital_file:
        return _err("NOT_AVAILABLE", "This item isn't available for download.",
                     status.HTTP_400_BAD_REQUEST)

    from django.urls import reverse
    return Response({"success": True, "data": {
        "download_url": reverse("orders:download_product", args=[reference, item_id]),
    }})
