from rest_framework import serializers

from apps.catalog.api.serializers import (
    ProductColorVariantSerializer, ProductImageSerializer, ProductSizeVariantSerializer, rating_summary,
)
from apps.catalog.models import Product

from ..models import SellerPayout, SellerProfile


class SellerProfileSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            "store_name", "store_slug", "store_description", "logo", "banner",
            "phone", "business_email", "status", "status_label", "rejection_reason",
        )
        read_only_fields = ("store_slug", "status", "status_label", "rejection_reason")


class SellerBankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ("bank_name", "bank_account_number", "bank_account_name")


class SellerDashboardSerializer(serializers.Serializer):
    """Not a ModelSerializer - assembled by the view from several sources
    (profile properties + apps.sellers.analytics), same numbers the
    template dashboard shows."""
    total_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_items_sold = serializers.IntegerField()
    pending_fulfillment_count = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    refunded_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class SellerProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    gallery_images = ProductImageSerializer(many=True, read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    size_variants = ProductSizeVariantSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "category", "category_name", "name", "slug", "description",
            "price", "image", "product_type", "digital_file", "stock",
            "affiliate_commission_rate", "is_active", "created_at",
            "gallery_images", "color_variants", "size_variants", "average_rating", "review_count",
        )
        read_only_fields = ("id", "slug", "created_at")

    def get_average_rating(self, obj):
        return rating_summary(obj)[0]

    def get_review_count(self, obj):
        return rating_summary(obj)[1]

    def validate_affiliate_commission_rate(self, value):
        from apps.core.constants import AFFILIATE_COMMISSION_RATE_MAX, AFFILIATE_COMMISSION_RATE_MIN
        if value is None or not (AFFILIATE_COMMISSION_RATE_MIN <= value <= AFFILIATE_COMMISSION_RATE_MAX):
            raise serializers.ValidationError(
                f"Must be between {AFFILIATE_COMMISSION_RATE_MIN} and {AFFILIATE_COMMISSION_RATE_MAX}."
            )
        return value


class SellerOrderRowSerializer(serializers.Serializer):
    """Mirrors build_seller_order_row()'s dict shape - see
    apps.sellers.order_status for why the status is derived, not stored."""
    item_id = serializers.UUIDField()
    order_reference = serializers.CharField()
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    fulfillment_status = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    is_paid = serializers.BooleanField()
    customer_name = serializers.CharField()
    customer_area = serializers.CharField()
    customer_phone = serializers.CharField()
    rider_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()


class SellerPayoutSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SellerPayout
        fields = ("id", "amount", "status", "status_label", "reference", "created_at")


class PublicStoreSerializer(serializers.ModelSerializer):
    """
    Public shape for GET /api/sellers/store/{slug}/ (roadmap Phase 15).

    Deliberately separate from every other seller serializer in this
    file: those all assume `request.user` owns the profile being
    serialized (dashboard context). This one is served to anonymous
    visitors, so it only exposes what apps.sellers.views.public_store_view
    already rendered in the public template - no contact/bank/payout
    fields, no status/rejection_reason (a suspended or pending seller's
    store 404s before this serializer ever runs - see the view).
    """

    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            "store_name", "store_slug", "store_description", "logo", "banner",
            "average_rating", "review_count",
        )
