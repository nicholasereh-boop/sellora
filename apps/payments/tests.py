from django.test import TestCase

# Create your tests here.


# ---------------------------------------------------------------------------
# Post-payment callback now hands the browser to the React app
# ---------------------------------------------------------------------------
from unittest import mock as _mock

from django.test import TestCase as _TestCase, override_settings as _override_settings


@_override_settings(FRONTEND_URL="http://frontend.test")
class PaymentCallbackRedirectTests(_TestCase):
    def test_missing_reference_goes_to_cart(self):
        r = self.client.get("/payments/callback/")
        self.assertEqual(r.status_code, 302)
        self.assertEqual(r.url, "http://frontend.test/cart")

    def test_success_and_failure_redirect_to_result_page(self):
        payment = _mock.Mock()
        payment.order.reference = "ORD-123"
        with _mock.patch("apps.payments.views.verify_payment", return_value=(payment, True)):
            r = self.client.get("/payments/callback/?reference=abc")
        self.assertEqual(r.url, "http://frontend.test/payment/result/ORD-123?status=success")
        with _mock.patch("apps.payments.views.verify_payment", return_value=(payment, False)):
            r = self.client.get("/payments/callback/?reference=abc")
        self.assertEqual(r.url, "http://frontend.test/payment/result/ORD-123?status=failed")

    def test_retired_template_routes_are_gone(self):
        self.assertEqual(self.client.get("/payments/success/ORD-123/").status_code, 404)
        self.assertEqual(self.client.get("/payments/initiate/ORD-123/").status_code, 404)
