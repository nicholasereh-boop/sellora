import hashlib
import hmac
import json

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt

from apps.core.exceptions import ValidationFailedError

from .services import verify_payment


def payment_callback(request):
    """
    Paystack redirects the buyer's browser here after checkout. We verify
    the payment server-side (same verify_payment the webhook uses) and then
    send the browser on to the React app's payment result page.
    """
    frontend = settings.FRONTEND_URL.rstrip("/")
    reference = request.GET.get("reference")

    if not reference:
        return redirect(f"{frontend}/cart")

    try:
        payment, success = verify_payment(reference)
    except ValidationFailedError:
        return redirect(f"{frontend}/cart")

    outcome = "success" if success else "failed"
    return redirect(f"{frontend}/payment/result/{payment.order.reference}?status={outcome}")


@csrf_exempt
def paystack_webhook(request):
    """
    Server-to-server confirmation, independent of whether the user's
    browser made it back to payment_callback. Same signature-verification
    pattern as the legacy apps.views.paystack_webhook.
    """
    paystack_signature = request.headers.get("x-paystack-signature")

    if not paystack_signature:
        return HttpResponse(status=400)

    body = request.body
    secret = settings.PAYSTACK_SECRET_KEY.encode("utf-8")
    computed_signature = hmac.new(secret, body, hashlib.sha512).hexdigest()

    if not hmac.compare_digest(paystack_signature, computed_signature):
        return HttpResponse(status=401)

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        return HttpResponse(status=400)

    event_type = event.get("event")

    if event_type == "charge.success":
        reference = event["data"]["reference"]
        try:
            verify_payment(reference)
        except ValidationFailedError:
            pass  # unknown reference - nothing to do

    elif event_type in ("transfer.success", "transfer.failed", "transfer.reversed"):
        _handle_transfer_event(event_type, event["data"])

    return HttpResponse(status=200)


def _handle_transfer_event(event_type, data):
    """
    Phase 10 - settles a seller/affiliate payout once Paystack confirms
    (or fails) the actual bank transfer. `data["reference"]` is the same
    value passed as `reference` to initiate_transfer - the payout's own
    reference (prefixed SPO-/APO- by apps.core.utils.generate_reference),
    so the prefix alone tells us which model to look in.
    """
    reference = data.get("reference", "")

    if reference.startswith("SPO-"):
        from apps.sellers.models import SellerPayout
        from apps.sellers.services import mark_seller_payout_failed, mark_seller_payout_paid

        payout = SellerPayout.objects.filter(reference=reference).first()
        if payout is None:
            return
        if event_type == "transfer.success":
            mark_seller_payout_paid(payout=payout)
        else:
            mark_seller_payout_failed(payout=payout, reason=f"Paystack {event_type}")

    elif reference.startswith("APO-"):
        from apps.affiliates.models import AffiliatePayout
        from apps.affiliates.services import mark_affiliate_payout_failed, mark_affiliate_payout_paid

        payout = AffiliatePayout.objects.filter(reference=reference).first()
        if payout is None:
            return
        if event_type == "transfer.success":
            mark_affiliate_payout_paid(payout=payout)
        else:
            mark_affiliate_payout_failed(payout=payout, reason=f"Paystack {event_type}")