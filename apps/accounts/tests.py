from django.test import TestCase

# Create your tests here.


# ---------------------------------------------------------------------------
# React-era account flows (verification link + password reset confirm)
# ---------------------------------------------------------------------------
from django.contrib.auth import get_user_model as _get_user_model
from django.contrib.auth.tokens import default_token_generator as _default_token_generator
from django.core import mail as _mail
from django.test import TestCase as _TestCase, override_settings as _override_settings
from django.utils.encoding import force_bytes as _force_bytes
from django.utils.http import urlsafe_base64_encode as _b64
from rest_framework.test import APIClient as _APIClient

from .emails import send_verification_email as _send_verification_email
from .tokens import email_verification_token as _email_token


@_override_settings(FRONTEND_URL="http://frontend.test")
class EmailLinkFlowTests(_TestCase):
    def setUp(self):
        User = _get_user_model()
        self.user = User.objects.create_user("zoe", "zoe@example.com", "old-pass-12345", is_active=False)
        self.client = _APIClient()
        self.uid = _b64(_force_bytes(self.user.pk))

    def test_verification_email_links_to_the_react_app_and_activates(self):
        _send_verification_email(None, self.user)
        body = _mail.outbox[0].body
        self.assertIn("http://frontend.test/verify-email/", body)

        token = _email_token.make_token(self.user)
        r = self.client.post("/api/auth/verify-email/", {"uid": self.uid, "token": token}, format="json")
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

        # the same link can't be replayed
        r = self.client.post("/api/auth/verify-email/", {"uid": self.uid, "token": token}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_verification_rejects_bad_token(self):
        r = self.client.post("/api/auth/verify-email/", {"uid": self.uid, "token": "nope"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_password_reset_email_links_to_react_and_confirm_sets_password(self):
        self.user.is_active = True
        self.user.save()
        r = self.client.post("/api/auth/password-reset/", {"email": "zoe@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("http://frontend.test/reset-password/", _mail.outbox[0].body)

        token = _default_token_generator.make_token(self.user)
        r = self.client.post("/api/auth/password-reset/confirm/", {
            "uid": self.uid, "token": token,
            "new_password1": "brand-new-pass-987", "new_password2": "brand-new-pass-987",
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("brand-new-pass-987"))

    def test_password_reset_confirm_validates(self):
        self.user.is_active = True
        self.user.save()
        token = _default_token_generator.make_token(self.user)
        r = self.client.post("/api/auth/password-reset/confirm/", {
            "uid": self.uid, "token": token, "new_password1": "abc", "new_password2": "xyz",
        }, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/auth/password-reset/confirm/", {
            "uid": self.uid, "token": "bad", "new_password1": "brand-new-pass-987", "new_password2": "brand-new-pass-987",
        }, format="json")
        self.assertEqual(r.status_code, 400)
