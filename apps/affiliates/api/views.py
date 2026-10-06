"""
Affiliate portal API (roadmap Phase 10).

Same reuse principle as sellers/orders: every view calls the existing
apps.affiliates.services functions. Attribution itself (the
apps.affiliates.middleware cookie/session logic that decides which
affiliate a visit or order is credited to) is untouched - nothing here
duplicates or recomputes it, per the roadmap's explicit instruction not
to move attribution calculations into React.
"""
from decimal import Decimal, InvalidOperation

from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalog.models import Product
from apps.core.exceptions import ValidationFailedError

from ..forms import AffiliateApplicationForm, AffiliateBankDetailsForm
from ..models import AffiliateStatus
from ..services import (
    affiliate_analytics,
    apply_for_affiliate,
    generate_affiliate_link,
    request_affiliate_payout,
    resolve_affiliate_commission_rate,
    resubmit_affiliate_application,
)
from .serializers import (
    AffiliateBankDetailsSerializer,
    AffiliateCommissionSerializer,
    AffiliateLinkSerializer,
    AffiliatePayoutSerializer,
    AffiliateProfileSerializer,
    PromotableProductSerializer,
)


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


def _form_errors(form):
    return {field: [str(e) for e in errs] for field, errs in form.errors.items()}


def _require_active_affiliate(request):
    """Same gate as apps.affiliates.permissions.active_affiliate_required,
    as a function returning a DRF Response (or None) instead of redirecting."""
    profile = getattr(request.user, "affiliate_profile", None)
    if profile is None:
        return None, _err("NOT_AN_AFFILIATE", "You need to apply as an affiliate first.",
                           status.HTTP_403_FORBIDDEN)
    if profile.status != AffiliateStatus.ACTIVE:
        return None, _err(
            "AFFILIATE_NOT_ACTIVE",
            f"Your affiliate application is currently {profile.get_status_display().lower()}.",
            status.HTTP_403_FORBIDDEN,
        )
    return profile, None


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def application_view(request):
    """
    GET /api/affiliates/application/ - current application, or null.
    POST /api/affiliates/application/ - new application, or resubmission
    if the existing one was REJECTED (same rule as the template view).
    """
    existing = getattr(request.user, "affiliate_profile", None)

    if request.method == "GET":
        if existing is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": AffiliateProfileSerializer(existing).data})

    is_resubmission = existing is not None and existing.status == AffiliateStatus.REJECTED
    if existing is not None and not is_resubmission:
        return _err("ALREADY_APPLIED", "You already have an affiliate application on file.",
                     status.HTTP_400_BAD_REQUEST)

    form = AffiliateApplicationForm(request.data)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        if is_resubmission:
            profile = resubmit_affiliate_application(profile=existing, **form.cleaned_data)
        else:
            profile = apply_for_affiliate(user=request.user, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": AffiliateProfileSerializer(profile).data},
                     status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """GET /api/affiliates/dashboard/"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    total_clicks = profile.total_clicks
    total_conversions = profile.total_conversions
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks else Decimal("0")

    return Response({"success": True, "data": {
        "profile": AffiliateProfileSerializer(profile).data,
        "total_links": profile.links.filter(is_active=True).count(),
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "conversion_rate": conversion_rate,
        "total_earnings": profile.total_earnings,
        "pending_earnings": profile.pending_earnings,
        "available_balance": profile.available_earnings,
    }})


# ---------------------------------------------------------------------------
# Referral links
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def links_view(request):
    """GET /api/affiliates/links/ - this affiliate's active links + promotable products."""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    links = profile.links.filter(is_active=True).select_related("product")

    already_linked_ids = links.values_list("product_id", flat=True)
    promotable = (
        Product.active.filter(is_active=True)
        .exclude(pk__in=already_linked_ids)
        .select_related("category")
    )
    promotable_data = []
    for product in promotable:
        rate = resolve_affiliate_commission_rate(product=product, affiliate=profile)
        promotable_data.append({
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "image": product.image,
            "price": product.price,
            "affiliate_commission_rate": rate,
            "estimated_commission": (product.price * rate / 100).quantize(Decimal("0.01")),
        })

    return Response({"success": True, "data": {
        "links": AffiliateLinkSerializer(links, many=True, context={"request": request}).data,
        "promotable_products": PromotableProductSerializer(promotable_data, many=True).data,
    }})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def link_detail_view(request, link_id):
    """GET /api/affiliates/links/{link_id}/ - scoped to this affiliate's own links."""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    link = get_object_or_404(profile.links.select_related("product"), pk=link_id)
    return Response({"success": True, "data": AffiliateLinkSerializer(link, context={"request": request}).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_link_view(request, product_id):
    """POST /api/affiliates/links/generate/{product_id}/"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    product = get_object_or_404(Product.active, pk=product_id, is_active=True)
    link = generate_affiliate_link(affiliate=profile, product=product)
    return Response({"success": True, "data": AffiliateLinkSerializer(link, context={"request": request}).data},
                     status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Conversions / commissions
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversions_view(request):
    """GET /api/affiliates/conversions/?status=...&page=..."""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    commissions = (
        profile.commissions.filter(reversal_of__isnull=True)
        .select_related("order", "order_item")
        .order_by("-created_at")
    )

    status_filter = request.query_params.get("status")
    if status_filter:
        commissions = commissions.filter(status=status_filter)

    paginator = Paginator(commissions, 20)
    page_obj = paginator.get_page(request.query_params.get("page"))

    return Response({"success": True, "data": {
        "results": AffiliateCommissionSerializer(page_obj.object_list, many=True).data,
        "count": paginator.count,
        "num_pages": paginator.num_pages,
        "page": page_obj.number,
    }})


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def _clean_days_param(raw):
    try:
        days = int(raw)
    except (TypeError, ValueError):
        return 30
    return days if days in (7, 30, 90) else 30


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_view(request):
    """GET /api/affiliates/analytics/?days=7|30|90"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    days = _clean_days_param(request.query_params.get("days"))
    return Response({"success": True, "data": {
        "days": days,
        **affiliate_analytics(profile, days=days),
    }})


# ---------------------------------------------------------------------------
# Bank details / payouts
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def bank_details_view(request):
    """GET/PATCH /api/affiliates/bank-details/"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    if request.method == "GET":
        return Response({"success": True, "data": AffiliateBankDetailsSerializer(profile).data})

    form = AffiliateBankDetailsForm(request.data, instance=profile)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    return Response({"success": True, "data": AffiliateBankDetailsSerializer(profile).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payouts_view(request):
    """GET /api/affiliates/payouts/"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    from apps.core.enums import PayoutStatus
    return Response({"success": True, "data": {
        "available_balance": profile.withdrawable_balance,
        "pending_earnings": profile.pending_earnings,
        "payouts": AffiliatePayoutSerializer(profile.payouts.all(), many=True).data,
        "has_pending_request": profile.payouts.filter(
            status__in=[PayoutStatus.PENDING, PayoutStatus.PROCESSING],
        ).exists(),
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def payout_request_view(request):
    """POST /api/affiliates/payouts/request/"""
    profile, error = _require_active_affiliate(request)
    if error:
        return error

    try:
        amount = Decimal(request.data.get("amount") or "0")
    except InvalidOperation:
        return _err("VALIDATION_ERROR", "Enter a valid amount.", status.HTTP_400_BAD_REQUEST)

    try:
        payout = request_affiliate_payout(affiliate=profile, amount=amount)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": AffiliatePayoutSerializer(payout).data},
                     status=status.HTTP_201_CREATED)
