

# ---------------------------------------------------------------------------
# Withdrawals are only for verified (KYC-confirmed) sellers and riders
# ---------------------------------------------------------------------------
from unittest import mock as _mock

from django.contrib.auth import get_user_model as _get_user_model
from django.test import TestCase as _TestCase
from rest_framework.test import APIClient as _APIClient

from apps.core.enums import KYCStatus as _KYCStatus
from apps.core.exceptions import ValidationFailedError as _ValidationFailedError
from apps.kyc.models import RiderKYC as _RiderKYC, SellerKYC as _SellerKYC
from apps.riders.models import RiderProfile as _RiderProfile, RiderStatus as _RiderStatus
from apps.riders.services import mark_rider_earning_paid as _mark_rider_earning_paid
from apps.sellers.models import SellerProfile as _SellerProfile, SellerStatus as _SellerStatus
from apps.sellers.services import request_seller_payout as _request_seller_payout, send_seller_payout as _send_seller_payout


class WithdrawalRequiresVerificationTests(_TestCase):
    def setUp(self):
        User = _get_user_model()
        self.seller_user = User.objects.create_user("vsel", "vsel@example.com", "pw12345!")
        self.seller = _SellerProfile.objects.create(
            user=self.seller_user, store_name="V Store", store_slug="v-store",
            phone="0800", business_email="vsel@example.com", status=_SellerStatus.APPROVED,
        )
        self.rider_user = User.objects.create_user("vrid", "vrid@example.com", "pw12345!")
        self.rider = _RiderProfile.objects.create(
            user=self.rider_user, full_name="V Rider", phone="0800", service_area="Ibadan",
            vehicle_type="bicycle", status=_RiderStatus.APPROVED,
        )

    # ---- sellers
    def test_unverified_seller_cannot_request_payout(self):
        for status in (None, _KYCStatus.SUBMITTED, _KYCStatus.UNDER_REVIEW, _KYCStatus.REJECTED, _KYCStatus.RESUBMISSION):
            if status:
                _SellerKYC.objects.update_or_create(seller=self.seller, defaults={"status": status})
            with self.assertRaises(_ValidationFailedError) as ctx:
                _request_seller_payout(seller=self.seller, amount=5000)
            self.assertIn("verified", str(ctx.exception))

    def test_confirmed_seller_gets_past_the_gate(self):
        _SellerKYC.objects.create(seller=self.seller, status=_KYCStatus.CONFIRMED)
        # no bank details yet -> a *different* validation error proves the gate passed
        with self.assertRaises(_ValidationFailedError) as ctx:
            _request_seller_payout(seller=self.seller, amount=5000)
        self.assertIn("bank details", str(ctx.exception))

    def test_unverified_seller_payout_cannot_be_sent(self):
        payout = _mock.Mock(seller=self.seller, status="pending")
        with self.assertRaises(_ValidationFailedError):
            _send_seller_payout(payout=payout)

    def test_seller_api_blocks_and_reports_verification(self):
        client = _APIClient()
        client.force_authenticate(self.seller_user)

        r = client.get("/api/sellers/payouts/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["data"]["can_withdraw"])
        self.assertEqual(r.json()["data"]["kyc_status"], "not_submitted")

        r = client.post("/api/sellers/payouts/request/", {"amount": "5000"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("verified", r.json()["error"]["message"])

        _SellerKYC.objects.create(seller=self.seller, status=_KYCStatus.CONFIRMED)
        r = client.get("/api/sellers/payouts/")
        self.assertTrue(r.json()["data"]["can_withdraw"])

    # ---- riders
    def test_rider_earning_cannot_be_paid_until_verified(self):
        earning = _mock.Mock(rider=self.rider)
        with self.assertRaises(_ValidationFailedError):
            _mark_rider_earning_paid(earning=earning)
        earning.save.assert_not_called()

        _RiderKYC.objects.create(rider=self.rider, status=_KYCStatus.CONFIRMED)
        _mark_rider_earning_paid(earning=earning)
        earning.save.assert_called_once()

    def test_rider_api_reports_verification(self):
        client = _APIClient()
        client.force_authenticate(self.rider_user)
        r = client.get("/api/riders/earnings/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()["data"]["can_withdraw"])
        _RiderKYC.objects.create(rider=self.rider, status=_KYCStatus.CONFIRMED)
        r = client.get("/api/riders/earnings/")
        self.assertTrue(r.json()["data"]["can_withdraw"])
