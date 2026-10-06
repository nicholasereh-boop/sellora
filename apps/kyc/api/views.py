"""
KYC submission API (roadmap Phase 13).

Mirrors apps.kyc.views exactly: same ownership checks (own profile
only), same Forms for validation, same submit_*_kyc() service calls.
Encryption (EncryptedCharField), authorization, and validation all stay
in Django - this is a thin JSON wrapper, never a second implementation.

Security notes specific to this phase (see the roadmap's explicit
rules): document uploads are multipart (request.FILES, exactly like the
Django view); GET responses never include id_document_number or
drivers_license_number (see .serializers's docstring) so nothing
sensitive is ever sitting in a browser-side cache.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.exceptions import ValidationFailedError

from . import serializers
from ..forms import AffiliateKYCForm, BuyerKYCForm, RiderKYCForm, SellerKYCForm
from ..models import AffiliateKYC, BuyerKYC, RiderKYC, SellerKYC
from ..services import submit_affiliate_kyc, submit_buyer_kyc, submit_rider_kyc, submit_seller_kyc


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


def _form_errors(form):
    return {field: [str(e) for e in errs] for field, errs in form.errors.items()}


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def buyer_kyc_view(request):
    """GET/POST /api/kyc/buyer/"""
    instance = BuyerKYC.objects.filter(user=request.user).first()

    if request.method == "GET":
        if instance is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": serializers.BuyerKYCSerializer(instance).data})

    form = BuyerKYCForm(request.data, instance=instance)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        instance = submit_buyer_kyc(user=request.user, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": serializers.BuyerKYCSerializer(instance).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def seller_kyc_view(request):
    """GET/POST /api/kyc/seller/ - multipart for id_document_file."""
    profile = getattr(request.user, "seller_profile", None)
    if profile is None:
        return _err("NOT_A_SELLER", "You need to apply as a seller first.", status.HTTP_403_FORBIDDEN)

    instance = SellerKYC.objects.filter(seller=profile).first()

    if request.method == "GET":
        if instance is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": serializers.SellerKYCSerializer(instance).data})

    form = SellerKYCForm(request.data, request.FILES, instance=instance)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        instance = submit_seller_kyc(seller=profile, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": serializers.SellerKYCSerializer(instance).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def affiliate_kyc_view(request):
    """GET/POST /api/kyc/affiliate/ - multipart for id_document_file."""
    profile = getattr(request.user, "affiliate_profile", None)
    if profile is None:
        return _err("NOT_AN_AFFILIATE", "You need to apply as an affiliate first.", status.HTTP_403_FORBIDDEN)

    instance = AffiliateKYC.objects.filter(affiliate=profile).first()

    if request.method == "GET":
        if instance is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": serializers.AffiliateKYCSerializer(instance).data})

    form = AffiliateKYCForm(request.data, request.FILES, instance=instance)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        instance = submit_affiliate_kyc(affiliate=profile, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": serializers.AffiliateKYCSerializer(instance).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def rider_kyc_view(request):
    """GET/POST /api/kyc/rider/ - multipart for id_document_file/drivers_license_file."""
    profile = getattr(request.user, "rider_profile", None)
    if profile is None:
        return _err("NOT_A_RIDER", "You need to apply as a rider first.", status.HTTP_403_FORBIDDEN)

    instance = RiderKYC.objects.filter(rider=profile).first()

    if request.method == "GET":
        if instance is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": serializers.RiderKYCSerializer(instance).data})

    form = RiderKYCForm(request.data, request.FILES, instance=instance)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        instance = submit_rider_kyc(rider=profile, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": serializers.RiderKYCSerializer(instance).data})
