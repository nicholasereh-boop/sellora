"""
Custom admin API (roadmap Phase 16, Option B - full React conversion,
done after customer/seller/affiliate/rider/logistics were stable, per
the roadmap's recommended sequence).

This is entirely separate from Django's own /admin/ (django.contrib.admin),
which the roadmap explicitly says to leave untouched - these views cover
only the *custom* admin area at apps/views.py (dashboard, analytics,
orders, products, users, messages, add/edit/delete product, and the
custom staff auth pages).

Every number and query here is copied verbatim from the matching
apps.views function - no new business logic, no new aggregation this
migration invents. Where the source view's own comments flag something
as legacy or stale, that's preserved rather than "fixed" here.
"""
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.affiliates.models import (
    AffiliateCommission, AffiliatePayout, AffiliateProfile, AffiliateStatus, CommissionStatus,
)
from apps.affiliates.services import approve_affiliate, reject_affiliate
from apps.catalog.models import Product, Review
from apps.catalog.gallery import parse_gallery, save_gallery
from apps.catalog.variants import VariantValidationError, parse_variants, sync_variants
from apps.core.enums import PayoutStatus, RefundStatus
from apps.notifications.models import Notification
from apps.orders.api.serializers import OrderListSerializer
from apps.orders.models import Order as RealOrder, OrderStatus, Refund
from apps.riders.models import RiderEarning, RiderEarningStatus, RiderProfile, RiderStatus
from apps.riders.services import approve_rider, reject_rider
from apps.sellers.models import EarningStatus, SellerEarning, SellerPayout, SellerProfile, SellerStatus
from apps.sellers.services import approve_seller, reject_seller

from ..models import ContactMessage, Order
from .permissions import IsAdminStaff
from .serializers import (
    AdminOrderSerializer,
    AdminProductSerializer,
    AdminUserSerializer,
    ContactMessageSerializer,
    PendingAffiliateApplicationSerializer,
    PendingRiderApplicationSerializer,
    PendingSellerApplicationSerializer,
)

User = get_user_model()


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


@api_view(["GET"])
@permission_classes([IsAdminStaff])
def dashboard_view(request):
    """GET /api/admin/dashboard/ - mirrors apps.views.admin_dashboard exactly."""
    total_users = User.objects.count()
    total_products = Product.objects.count()
    total_messages = ContactMessage.objects.count()
    total_orders = RealOrder.objects.count()

    revenue = RealOrder.objects.filter(
        status__in=[OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
    ).aggregate(total=Sum("total"))["total"] or 0

    failed_purchases = RealOrder.objects.filter(status=OrderStatus.FAILED).count()

    total_sellers = SellerProfile.objects.count()
    pending_seller_applications = SellerProfile.objects.filter(status=SellerStatus.PENDING).count()
    total_affiliates = AffiliateProfile.objects.count()
    pending_affiliate_applications = AffiliateProfile.objects.filter(status=AffiliateStatus.PENDING).count()
    total_riders = RiderProfile.objects.count()
    pending_rider_applications = RiderProfile.objects.filter(status=RiderStatus.PENDING).count()
    total_reviews = Review.objects.count()
    total_notifications_sent = Notification.objects.count()

    pending_seller_payouts = SellerPayout.objects.filter(status=PayoutStatus.PENDING).count()
    pending_affiliate_payouts = AffiliatePayout.objects.filter(status=PayoutStatus.PENDING).count()

    owed_statuses = (EarningStatus.CONFIRMED, EarningStatus.AVAILABLE)
    seller_liabilities = SellerEarning.objects.filter(
        reversal_of__isnull=True, status__in=owed_statuses,
    ).aggregate(total=Sum("earning_amount"))["total"] or 0

    owed_commission_statuses = (CommissionStatus.CONFIRMED, CommissionStatus.AVAILABLE)
    affiliate_liabilities = AffiliateCommission.objects.filter(
        reversal_of__isnull=True, status__in=owed_commission_statuses,
    ).aggregate(total=Sum("commission_amount"))["total"] or 0

    owed_rider_statuses = (RiderEarningStatus.CONFIRMED, RiderEarningStatus.AVAILABLE)
    rider_payments = RiderEarning.objects.filter(
        reversal_of__isnull=True, status__in=owed_rider_statuses,
    ).aggregate(total=Sum("amount"))["total"] or 0

    platform_revenue = SellerEarning.objects.filter(reversal_of__isnull=True).aggregate(
        total=Sum("platform_commission_amount")
    )["total"] or 0

    pending_refunds = Refund.objects.filter(status=RefundStatus.REQUESTED).count()

    active_dispute_statuses = (
        RefundStatus.UNDER_REVIEW, RefundStatus.RETURN_IN_PROGRESS, RefundStatus.ITEM_RECEIVED,
        RefundStatus.SELLER_CONDITION_CONFIRMED, RefundStatus.PLATFORM_APPROVED, RefundStatus.PROCESSING,
    )
    active_disputes = Refund.objects.filter(status__in=active_dispute_statuses).count()

    recent_orders = OrderListSerializer(RealOrder.objects.order_by("-created_at")[:10], many=True).data
    recent_products = AdminProductSerializer(
        Product.objects.order_by("-created_at").prefetch_related("gallery_images", "color_variants", "size_variants", "reviews")[:10],
        many=True,
    ).data
    recent_messages = ContactMessageSerializer(ContactMessage.objects.order_by("-created_at")[:10], many=True).data

    return Response({"success": True, "data": {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "failed_purchases": failed_purchases,
        "total_messages": total_messages,
        "revenue": revenue,
        "recent_orders": recent_orders,
        "recent_products": recent_products,
        "recent_messages": recent_messages,
        "total_sellers": total_sellers,
        "pending_seller_applications": pending_seller_applications,
        "pending_seller_payouts": pending_seller_payouts,
        "total_affiliates": total_affiliates,
        "pending_affiliate_applications": pending_affiliate_applications,
        "pending_affiliate_payouts": pending_affiliate_payouts,
        "total_riders": total_riders,
        "pending_rider_applications": pending_rider_applications,
        "total_reviews": total_reviews,
        "total_notifications_sent": total_notifications_sent,
        "gross_marketplace_volume": revenue,
        "platform_revenue": platform_revenue,
        "seller_liabilities": seller_liabilities,
        "affiliate_liabilities": affiliate_liabilities,
        "rider_payments": rider_payments,
        "pending_refunds": pending_refunds,
        "active_disputes": active_disputes,
    }})


@api_view(["GET"])
@permission_classes([IsAdminStaff])
def analytics_view(request):
    """GET /api/admin/analytics/ - mirrors apps.views.admin_analytics exactly."""
    since = timezone.now() - timedelta(days=30)

    def _daily(queryset, value_field=None):
        rows = (
            queryset.filter(created_at__gte=since)
            .annotate(bucket=TruncDate("created_at"))
            .values("bucket")
            .annotate(total=Sum(value_field) if value_field else Count("id"))
            .order_by("bucket")
        )
        return {
            "labels": [row["bucket"].strftime("%b %-d") for row in rows],
            "values": [float(row["total"] or 0) for row in rows],
        }

    revenue_by_day = _daily(
        RealOrder.objects.filter(status__in=[OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
        value_field="total",
    )
    orders_by_day = _daily(RealOrder.objects.all())
    refunds_by_day = _daily(Refund.objects.all())

    revenue_distribution = {
        "labels": ["Seller Earnings", "Affiliate Commissions", "Rider Payments", "Platform Revenue"],
        "values": [
            float(SellerEarning.objects.filter(reversal_of__isnull=True).aggregate(t=Sum("earning_amount"))["t"] or 0),
            float(AffiliateCommission.objects.filter(reversal_of__isnull=True).aggregate(t=Sum("commission_amount"))["t"] or 0),
            float(RiderEarning.objects.filter(reversal_of__isnull=True).aggregate(t=Sum("amount"))["t"] or 0),
            float(SellerEarning.objects.filter(reversal_of__isnull=True).aggregate(t=Sum("platform_commission_amount"))["t"] or 0),
        ],
    }

    top_sellers_qs = (
        SellerEarning.objects.filter(reversal_of__isnull=True)
        .values("seller__store_name")
        .annotate(total=Sum("earning_amount"), sales=Count("id"))
        .order_by("-total")[:10]
    )
    top_sellers = {
        "labels": [row["seller__store_name"] for row in top_sellers_qs],
        "values": [float(row["total"] or 0) for row in top_sellers_qs],
    }

    top_affiliates_qs = (
        AffiliateProfile.objects.annotate(
            click_count=Count("clicks", distinct=True),
            conversion_count=Count(
                "commissions",
                filter=Q(commissions__reversal_of__isnull=True),
                distinct=True,
            ),
        ).order_by("-conversion_count")[:10]
    )
    top_affiliates = [
        {
            "name": affiliate.affiliate_code,
            "clicks": affiliate.click_count,
            "conversions": affiliate.conversion_count,
            "earnings": affiliate.total_earnings,
        }
        for affiliate in top_affiliates_qs
    ]

    return Response({"success": True, "data": {
        "revenue_by_day": revenue_by_day,
        "orders_by_day": orders_by_day,
        "refunds_by_day": refunds_by_day,
        "revenue_distribution": revenue_distribution,
        "top_sellers": top_sellers,
        "top_affiliates": top_affiliates,
    }})


# ---------------------------------------------------------------------------
# Legacy orders (apps.models.Order) - mirrors admin_orders/OrderAdminHelper.
# Deliberately not the same model as RealOrder above - see
# AdminOrderSerializer's docstring.
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminStaff])
def order_list_view(request):
    """GET /api/admin/orders/"""
    orders = Order.objects.all().order_by("-created_at")
    return Response({"success": True, "data": AdminOrderSerializer(orders, many=True).data})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def recover_order_view(request, pk):
    """
    POST /api/admin/orders/{pk}/recover/

    Mirrors OrderAdminHelper.recover_failed_purchase for a single order
    (the template's admin action worked on a queryset selection; one
    order at a time here since there's no equivalent bulk-select UI).
    """
    order = get_object_or_404(Order, pk=pk)
    if order.verified and not order.purchase_completed:
        order.purchase_completed = True
        order.status = "completed"
        order.save()
        return Response({"success": True, "data": AdminOrderSerializer(order).data})
    return _err("NOT_RECOVERABLE", "This order isn't in a recoverable state.", status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Products (apps.catalog.models.Product) - mirrors
# admin_products/add_product/edit_product/delete_product exactly,
# including that this form doesn't set category or seller.
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAdminStaff])
def product_list_create_view(request):
    """GET/POST /api/admin/products/"""
    if request.method == "GET":
        products = Product.objects.prefetch_related("gallery_images", "color_variants", "size_variants", "reviews")
        return Response({"success": True, "data": AdminProductSerializer(products, many=True).data})

    try:
        colors, sizes = parse_variants(request.data)
        new_images, remove_ids = parse_gallery(None, request.data, request.FILES)
    except VariantValidationError as exc:
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, exc.fields)

    serializer = AdminProductSerializer(data=request.data)
    if not serializer.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, serializer.errors)
    product = serializer.save()
    sync_variants(product, colors, sizes)
    save_gallery(product, new_images, remove_ids)
    return Response({"success": True, "data": AdminProductSerializer(product).data},
                     status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminStaff])
def product_detail_view(request, pk):
    """GET/PATCH/DELETE /api/admin/products/{pk}/"""
    product = get_object_or_404(Product, pk=pk)

    if request.method == "GET":
        return Response({"success": True, "data": AdminProductSerializer(product).data})

    if request.method == "DELETE":
        product.delete()
        return Response({"success": True, "data": {"message": "Product deleted."}})

    try:
        colors, sizes = parse_variants(request.data)
        new_images, remove_ids = parse_gallery(product, request.data, request.FILES)
    except VariantValidationError as exc:
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, exc.fields)

    serializer = AdminProductSerializer(product, data=request.data, partial=True)
    if not serializer.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, serializer.errors)
    product = serializer.save()
    sync_variants(product, colors, sizes)
    save_gallery(product, new_images, remove_ids)
    return Response({"success": True, "data": AdminProductSerializer(product).data})


# ---------------------------------------------------------------------------
# Users and messages - mirrors admin_users/admin_messages exactly (both
# are read-only in the existing templates - no edit/delete UI exists
# for either there, so none is added here either).
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminStaff])
def user_list_view(request):
    """GET /api/admin/users/"""
    users = User.objects.all()
    return Response({"success": True, "data": AdminUserSerializer(users, many=True).data})


@api_view(["GET"])
@permission_classes([IsAdminStaff])
def message_list_view(request):
    """GET /api/admin/messages/"""
    messages_list = ContactMessage.objects.all().order_by("-created_at")
    return Response({"success": True, "data": ContactMessageSerializer(messages_list, many=True).data})


# ---------------------------------------------------------------------------
# Custom staff authentication - mirrors apps.views.login_view/logout_view.
# Entirely separate from apps.accounts.api (customer auth) - staff
# accounts are gated on is_staff/is_superuser.
#
# DELIBERATELY NOT MIGRATED: the legacy signup_view / verify_email. The
# legacy signup is open to anyone and creates is_staff=True accounts, so
# anyone with an email address could self-register as staff, verify
# their own email, and reach every admin page (all users' emails, all
# orders, revenue, product add/edit/delete). Copying that into a public
# JSON endpoint would publish the hole, so staff accounts are created by
# a superuser (Django /admin/ or `createsuperuser`) instead. See
# docs/react-migration/PROGRESS.md.
# ---------------------------------------------------------------------------

@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def admin_login_view(request):
    """POST /api/admin/auth/login/"""
    if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
        return Response({"success": True, "data": AdminUserSerializer(request.user).data})

    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)

    if user is None:
        return _err("INVALID_CREDENTIALS", "Invalid username or password.", status.HTTP_401_UNAUTHORIZED)

    if not (user.is_staff or user.is_superuser):
        return _err("FORBIDDEN", "You do not have permission to access this dashboard.",
                     status.HTTP_403_FORBIDDEN)

    login(request, user)
    return Response({"success": True, "data": AdminUserSerializer(user).data})


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAdminStaff])
def admin_logout_view(request):
    """POST /api/admin/auth/logout/"""
    logout(request)
    return Response({"success": True, "data": {"message": "Logged out."}})


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAdminStaff])
def admin_me_view(request):
    """
    GET /api/admin/auth/me/ - who is the current staff user?

    Exists so the React route guard can ask Django "is this session
    staff?" (the customer-facing /api/auth/me/ deliberately doesn't
    expose is_staff). A non-staff or anonymous session gets a 403 here,
    which the guard treats as "not an admin".
    """
    return Response({"success": True, "data": AdminUserSerializer(request.user).data})


# ---------------------------------------------------------------------------
# Application review (Needs attention cards on the dashboard). Each
# approve/reject view below calls the *exact same* service function as
# SellerProfileAdmin/AffiliateProfileAdmin/RiderProfileAdmin's bulk
# actions in apps/{sellers,affiliates,riders}/admin.py - same
# reviewed_by/reviewed_at/rejection_reason handling, same status
# transitions. Nothing here reimplements that logic; it's the same
# "one implementation of each rule" principle as the rest of this
# migration. Django's own /admin/ keeps working exactly as before -
# these are just a second caller of the same functions.
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminStaff])
def pending_seller_applications_view(request):
    """GET /api/admin/applications/sellers/"""
    qs = SellerProfile.objects.filter(status=SellerStatus.PENDING).select_related("user").order_by("created_at")
    return Response({"success": True, "data": PendingSellerApplicationSerializer(qs, many=True).data})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def approve_seller_application_view(request, pk):
    """POST /api/admin/applications/sellers/{pk}/approve/"""
    profile = get_object_or_404(SellerProfile, pk=pk, status=SellerStatus.PENDING)
    approve_seller(profile=profile, reviewed_by=request.user)
    return Response({"success": True, "data": {"message": f"{profile.store_name} approved."}})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def reject_seller_application_view(request, pk):
    """POST /api/admin/applications/sellers/{pk}/reject/  body: {reason?}"""
    profile = get_object_or_404(SellerProfile, pk=pk, status=SellerStatus.PENDING)
    reason = (request.data.get("reason") or "").strip() or "Rejected via admin review."
    reject_seller(profile=profile, reviewed_by=request.user, reason=reason)
    return Response({"success": True, "data": {"message": f"{profile.store_name} rejected."}})


@api_view(["GET"])
@permission_classes([IsAdminStaff])
def pending_affiliate_applications_view(request):
    """GET /api/admin/applications/affiliates/"""
    qs = AffiliateProfile.objects.filter(status=AffiliateStatus.PENDING).select_related("user").order_by("created_at")
    return Response({"success": True, "data": PendingAffiliateApplicationSerializer(qs, many=True).data})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def approve_affiliate_application_view(request, pk):
    """POST /api/admin/applications/affiliates/{pk}/approve/"""
    profile = get_object_or_404(AffiliateProfile, pk=pk, status=AffiliateStatus.PENDING)
    approve_affiliate(profile=profile, reviewed_by=request.user)
    return Response({"success": True, "data": {"message": f"{profile.full_name} approved."}})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def reject_affiliate_application_view(request, pk):
    """POST /api/admin/applications/affiliates/{pk}/reject/  body: {reason?}"""
    profile = get_object_or_404(AffiliateProfile, pk=pk, status=AffiliateStatus.PENDING)
    reason = (request.data.get("reason") or "").strip() or "Rejected via admin review."
    reject_affiliate(profile=profile, reviewed_by=request.user, reason=reason)
    return Response({"success": True, "data": {"message": f"{profile.full_name} rejected."}})


@api_view(["GET"])
@permission_classes([IsAdminStaff])
def pending_rider_applications_view(request):
    """GET /api/admin/applications/riders/"""
    qs = RiderProfile.objects.filter(status=RiderStatus.PENDING).select_related("user").order_by("created_at")
    return Response({"success": True, "data": PendingRiderApplicationSerializer(qs, many=True).data})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def approve_rider_application_view(request, pk):
    """POST /api/admin/applications/riders/{pk}/approve/"""
    profile = get_object_or_404(RiderProfile, pk=pk, status=RiderStatus.PENDING)
    approve_rider(profile=profile, reviewed_by=request.user)
    return Response({"success": True, "data": {"message": f"{profile.full_name} approved."}})


@api_view(["POST"])
@permission_classes([IsAdminStaff])
def reject_rider_application_view(request, pk):
    """POST /api/admin/applications/riders/{pk}/reject/  body: {reason?}"""
    profile = get_object_or_404(RiderProfile, pk=pk, status=RiderStatus.PENDING)
    reason = (request.data.get("reason") or "").strip() or "Rejected via admin review."
    reject_rider(profile=profile, reviewed_by=request.user, reason=reason)
    return Response({"success": True, "data": {"message": f"{profile.full_name} rejected."}})
