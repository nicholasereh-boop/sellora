"""
Seller portal API (roadmap Phase 9).

Same reuse principle as orders/payments: every view calls the existing
apps.sellers.services / apps.sellers.analytics / apps.sellers.order_status
functions. Ownership is still enforced the same way as the template
views - `request.user.seller_profile` and get_object_or_404(..., seller=
profile) - never trusted from anything the client sends.

Product image/color/size variant formsets (ProductImageFormSet etc.)
are NOT covered yet - SellerProductForm's core fields only. See
docs/react-migration/PROGRESS.md.
"""
from decimal import Decimal, InvalidOperation

from django.core.paginator import Paginator
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.catalog.api.serializers import ProductListSerializer
from apps.kyc.services import kyc_confirmed, kyc_status_for
from apps.catalog.gallery import parse_gallery, save_gallery
from apps.catalog.variants import VariantValidationError, parse_variants, sync_variants
from apps.catalog.models import Product, Review
from apps.core.enums import FulfillmentStatus
from apps.core.exceptions import ValidationFailedError
from apps.orders.models import OrderItem

from ..analytics import earnings_breakdown, orders_by_status, orders_over_time, product_performance, revenue_trend
from ..forms import SellerApplicationForm, SellerBankDetailsForm, SellerProductForm, SellerStoreSettingsForm
from ..models import SellerProfile, SellerStatus
from ..order_status import SellerOrderStatus, build_seller_order_row, seller_order_item_queryset
from ..services import apply_for_seller, request_seller_payout
from .serializers import (
    PublicStoreSerializer,
    SellerBankDetailsSerializer,
    SellerOrderRowSerializer,
    SellerPayoutSerializer,
    SellerProductSerializer,
    SellerProfileSerializer,
)


def _err(code, message, http_status, fields=None):
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return Response({"success": False, "error": error}, status=http_status)


def _form_errors(form):
    return {field: [str(e) for e in errs] for field, errs in form.errors.items()}


def _require_approved_seller(request):
    """
    Same gate as apps.sellers.permissions.approved_seller_required, as a
    function rather than a decorator so it returns a DRF Response (or
    None if OK) instead of redirecting - there's nowhere to redirect a
    JSON API client to.
    """
    profile = getattr(request.user, "seller_profile", None)
    if profile is None:
        return None, _err("NOT_A_SELLER", "You need to apply as a seller first.",
                           status.HTTP_403_FORBIDDEN)
    if profile.status != SellerStatus.APPROVED:
        return None, _err(
            "SELLER_NOT_APPROVED",
            f"Your seller application is currently {profile.get_status_display().lower()}.",
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
    GET /api/sellers/application/ - current application status (or null
    if the user has never applied).
    POST /api/sellers/application/ - submit a new application, same
    SellerApplicationForm as the template view.
    """
    existing = getattr(request.user, "seller_profile", None)

    if request.method == "GET":
        if existing is None:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": SellerProfileSerializer(existing).data})

    if existing is not None:
        return _err("ALREADY_APPLIED", "You already have a seller application on file.",
                     status.HTTP_400_BAD_REQUEST)

    form = SellerApplicationForm(request.data)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    try:
        profile = apply_for_seller(user=request.user, **form.cleaned_data)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": SellerProfileSerializer(profile).data},
                     status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """GET /api/sellers/dashboard/?revenue_period=daily|weekly|monthly"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    order_items = OrderItem.objects.filter(seller=profile)
    revenue_period = request.query_params.get("revenue_period", "daily")
    if revenue_period not in ("daily", "weekly", "monthly"):
        revenue_period = "daily"

    return Response({"success": True, "data": {
        "profile": SellerProfileSerializer(profile).data,
        "stats": {
            "total_products": profile.products.filter(deleted_at__isnull=True).count(),
            "total_orders": order_items.values("order_id").distinct().count(),
            "total_items_sold": order_items.count(),
            "pending_fulfillment_count": order_items.filter(
                fulfillment_status=FulfillmentStatus.PENDING
            ).count(),
            "total_sales": profile.total_sales,
            "total_earnings": profile.total_earnings,
            "pending_payout": profile.pending_earnings,
            "available_balance": profile.available_earnings,
            "paid_out": profile.paid_earnings,
            "refunded_amount": profile.refunded_amount,
        },
        "revenue_period": revenue_period,
        "revenue_trend": revenue_trend(profile, period=revenue_period),
        "orders_over_time": orders_over_time(profile),
        "orders_by_status": orders_by_status(profile),
        "earnings_breakdown": earnings_breakdown(profile),
        "product_performance": product_performance(profile),
    }})


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def product_list_create_view(request):
    profile, error = _require_approved_seller(request)
    if error:
        return error

    if request.method == "GET":
        products = (
            Product.objects.filter(seller=profile).select_related("category")
            .prefetch_related("gallery_images", "color_variants", "size_variants", "reviews")
            .order_by("-created_at")
        )
        paginator = Paginator(products, 20)
        page_obj = paginator.get_page(request.query_params.get("page"))
        return Response({"success": True, "data": {
            "results": SellerProductSerializer(page_obj.object_list, many=True).data,
            "count": paginator.count,
            "num_pages": paginator.num_pages,
            "page": page_obj.number,
        }})

    try:
        colors, sizes = parse_variants(request.data)
        new_images, remove_ids = parse_gallery(None, request.data, request.FILES)
    except VariantValidationError as exc:
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, exc.fields)

    form = SellerProductForm(request.data, request.FILES)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))

    product = form.save(commit=False)
    product.seller = profile  # never taken from client input
    product.save()
    sync_variants(product, colors, sizes)
    save_gallery(product, new_images, remove_ids)
    return Response({"success": True, "data": SellerProductSerializer(product).data},
                     status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def product_detail_view(request, pk):
    profile, error = _require_approved_seller(request)
    if error:
        return error

    product = get_object_or_404(Product, pk=pk, seller=profile)

    if request.method == "GET":
        return Response({"success": True, "data": SellerProductSerializer(product).data})

    if request.method == "DELETE":
        product.delete()  # soft delete (BaseModel.delete)
        return Response({"success": True, "data": None}, status=status.HTTP_204_NO_CONTENT)

    try:
        colors, sizes = parse_variants(request.data)
        new_images, remove_ids = parse_gallery(product, request.data, request.FILES)
    except VariantValidationError as exc:
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, exc.fields)

    form = SellerProductForm(request.data, request.FILES, instance=product)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    sync_variants(product, colors, sizes)
    save_gallery(product, new_images, remove_ids)
    return Response({"success": True, "data": SellerProductSerializer(product).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def product_toggle_active_view(request, pk):
    """POST /api/sellers/products/{pk}/toggle-active/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    product = get_object_or_404(Product, pk=pk, seller=profile)
    product.is_active = not product.is_active
    product.save(update_fields=["is_active", "updated_at"])
    return Response({"success": True, "data": {"is_active": product.is_active}})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def product_update_stock_view(request, pk):
    """POST /api/sellers/products/{pk}/stock/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    product = get_object_or_404(Product, pk=pk, seller=profile)

    try:
        new_stock = int(request.data.get("stock"))
        if new_stock < 0:
            raise ValueError
    except (TypeError, ValueError):
        return _err("VALIDATION_ERROR", "Stock must be a whole number of 0 or more.",
                     status.HTTP_400_BAD_REQUEST)

    product.stock = new_stock
    product.save(update_fields=["stock", "updated_at"])
    return Response({"success": True, "data": {"stock": product.stock}})


# ---------------------------------------------------------------------------
# Orders / fulfillment
# ---------------------------------------------------------------------------

def _serialize_row(row):
    item = row["item"]
    return {
        "item_id": item.id,
        "order_reference": row["order"].reference,
        "product_name": item.product_name,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "fulfillment_status": item.fulfillment_status,
        "status": row["status"],
        "status_label": row["status_label"],
        "is_paid": row["order"].is_paid,
        "customer_name": row["customer"]["full_name"],
        "customer_area": row["customer"]["area"],
        "customer_phone": row["customer"]["phone"],
        "rider_name": getattr(row["rider"], "get_full_name", lambda: None)() or None,
        "created_at": item.created_at,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_item_list_view(request):
    """GET /api/sellers/orders/?status=..."""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    items = seller_order_item_queryset(profile)
    rows = [build_seller_order_row(item) for item in items]

    status_filter = request.query_params.get("status")
    if status_filter in SellerOrderStatus.values:
        rows = [row for row in rows if row["status"] == status_filter]

    paginator = Paginator(rows, 20)
    page_obj = paginator.get_page(request.query_params.get("page"))
    serialized = [_serialize_row(r) for r in page_obj.object_list]

    return Response({"success": True, "data": {
        "results": SellerOrderRowSerializer(serialized, many=True).data,
        "count": paginator.count,
        "num_pages": paginator.num_pages,
        "page": page_obj.number,
        "status_choices": SellerOrderStatus.choices,
        "fulfillment_status_choices": FulfillmentStatus.choices,
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_fulfillment_status_view(request, item_id):
    """POST /api/sellers/orders/{item_id}/fulfillment/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    item = get_object_or_404(OrderItem, pk=item_id, seller=profile)

    if not item.order.is_paid:
        return _err("NOT_PAID", "Can't update fulfillment before the order is paid.",
                     status.HTTP_400_BAD_REQUEST)

    new_status = request.data.get("fulfillment_status")
    if new_status not in FulfillmentStatus.values:
        return _err("VALIDATION_ERROR", "Invalid status.", status.HTTP_400_BAD_REQUEST)

    item.fulfillment_status = new_status
    item.save(update_fields=["fulfillment_status", "updated_at"])
    return Response({"success": True, "data": {"fulfillment_status": item.fulfillment_status}})


# ---------------------------------------------------------------------------
# Store settings / bank details / payouts
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def store_settings_view(request):
    """GET/PATCH /api/sellers/store-settings/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    if request.method == "GET":
        return Response({"success": True, "data": SellerProfileSerializer(profile).data})

    form = SellerStoreSettingsForm(request.data, request.FILES, instance=profile)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    return Response({"success": True, "data": SellerProfileSerializer(profile).data})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def bank_details_view(request):
    """GET/PATCH /api/sellers/bank-details/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    if request.method == "GET":
        return Response({"success": True, "data": SellerBankDetailsSerializer(profile).data})

    form = SellerBankDetailsForm(request.data, instance=profile)
    if not form.is_valid():
        return _err("VALIDATION_ERROR", "Please correct the highlighted fields.",
                     status.HTTP_400_BAD_REQUEST, _form_errors(form))
    form.save()
    return Response({"success": True, "data": SellerBankDetailsSerializer(profile).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payouts_view(request):
    """GET /api/sellers/payouts/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    from apps.core.enums import PayoutStatus
    return Response({"success": True, "data": {
        "available_balance": profile.withdrawable_balance,
        "pending_earnings": profile.pending_earnings,
        "payouts": SellerPayoutSerializer(profile.payouts.all(), many=True).data,
        "has_pending_request": profile.payouts.filter(
            status__in=[PayoutStatus.PENDING, PayoutStatus.PROCESSING],
        ).exists(),
        "kyc_status": kyc_status_for(seller=profile)[0],
        "kyc_status_label": kyc_status_for(seller=profile)[1],
        "can_withdraw": kyc_confirmed(seller=profile),
    }})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def payout_request_view(request):
    """POST /api/sellers/payouts/request/"""
    profile, error = _require_approved_seller(request)
    if error:
        return error

    try:
        amount = Decimal(request.data.get("amount") or "0")
    except InvalidOperation:
        return _err("VALIDATION_ERROR", "Enter a valid amount.", status.HTTP_400_BAD_REQUEST)

    try:
        payout = request_seller_payout(seller=profile, amount=amount)
    except ValidationFailedError as e:
        return _err("VALIDATION_ERROR", str(e), status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "data": SellerPayoutSerializer(payout).data},
                     status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Public storefront (roadmap Phase 15) - mirrors
# apps.sellers.views.public_store_view exactly: same get_object_or_404
# (only an APPROVED seller's store resolves - others 404, same as the
# template view), same Product.active/is_active queryset, same ?q=/
# ?sort= handling. AllowAny - this is the one seller endpoint with no
# ownership check, because there's no owner to check against for a
# visitor.
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def public_store_view(request, slug):
    """GET /api/sellers/store/{slug}/ - store header info + rating."""
    seller = get_object_or_404(SellerProfile, store_slug=slug, status=SellerStatus.APPROVED)

    rating_data = Review.objects.filter(product__seller=seller).aggregate(
        average_rating=Avg("rating"), review_count=Count("id"),
    )
    seller.average_rating = round(rating_data["average_rating"], 1) if rating_data["average_rating"] else 0
    seller.review_count = rating_data["review_count"]

    return Response({"success": True, "data": PublicStoreSerializer(seller).data})


class PublicStoreProductListView(generics.ListAPIView):
    """
    GET /api/sellers/store/{slug}/products/?q=&sort=newest|price_asc|price_desc

    A 404 on the store itself (unapproved/nonexistent slug) is checked
    here too, not just on the store-info endpoint above, since a
    visitor could hit this URL directly.
    """
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        seller = get_object_or_404(
            SellerProfile, store_slug=self.kwargs["slug"], status=SellerStatus.APPROVED
        )
        qs = Product.active.filter(seller=seller, is_active=True).select_related("category").prefetch_related(
            "color_variants", "size_variants", "reviews"
        )

        query = self.request.query_params.get("q", "").strip()
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(description__icontains=query))

        sort = self.request.query_params.get("sort", "newest")
        if sort == "price_asc":
            qs = qs.order_by("price")
        elif sort == "price_desc":
            qs = qs.order_by("-price")
        else:
            qs = qs.order_by("-created_at")
        return qs
