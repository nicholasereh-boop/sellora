"""
Payments API (roadmap Phase 8).

Only payment *initiation* gets an API endpoint. The Paystack webhook
(apps.payments.urls -> payments:paystack_webhook) is left exactly where
it is - it's a server-to-server callback, not something React ever
calls, and moving it would risk breaking the URL already registered
with Paystack. PAYSTACK_SECRET_KEY never leaves the Django process.
"""
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order

from ..services import PaymentInitializationError, initialize_payment


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment_view(request, order_reference):
    """
    POST /api/payments/initiate/{order_reference}/

    Returns the Paystack authorization_url as JSON instead of an HTTP
    redirect, so React can send the browser there itself
    (window.location.href = authorization_url) - same
    apps.payments.services.initialize_payment() call the template view
    uses, so there's exactly one Paystack integration.
    """
    order = get_object_or_404(Order, reference=order_reference, user=request.user)

    if order.is_paid:
        return Response({"success": True, "data": {
            "already_paid": True,
            "order_reference": order.reference,
        }})

    callback_url = request.build_absolute_uri(reverse("payments:callback"))

    try:
        authorization_url = initialize_payment(order, callback_url)
    except PaymentInitializationError as e:
        return Response(
            {"success": False, "error": {"code": "PAYMENT_INIT_FAILED", "message": str(e)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"success": True, "data": {
        "authorization_url": authorization_url,
        "already_paid": False,
    }})
