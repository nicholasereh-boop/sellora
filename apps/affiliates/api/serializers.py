from rest_framework import serializers

from ..models import AffiliateLink, AffiliatePayout, AffiliateProfile


class AffiliateProfileSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AffiliateProfile
        fields = (
            "affiliate_code", "full_name", "phone", "contact_email",
            "promotional_channels", "status", "status_label", "rejection_reason",
        )
        read_only_fields = ("affiliate_code", "status", "status_label", "rejection_reason")


class AffiliateBankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateProfile
        fields = ("bank_code", "bank_account_number", "bank_account_name", "bank_name")
        read_only_fields = ("bank_name",)


class AffiliateLinkSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    target_url = serializers.CharField(read_only=True)
    click_count = serializers.IntegerField(source="total_clicks", read_only=True)
    conversion_count = serializers.IntegerField(source="total_conversions", read_only=True)
    earnings = serializers.DecimalField(source="total_earnings", max_digits=12, decimal_places=2, read_only=True)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = AffiliateLink
        fields = (
            "id", "product", "product_name", "product_slug", "product_image",
            "referral_code", "target_url", "click_count", "conversion_count",
            "earnings", "commission_rate", "created_at",
        )


class PromotableProductSerializer(serializers.Serializer):
    """Shape assembled by the view (Product + computed commission fields),
    not a plain ModelSerializer - mirrors my_links_view's template context."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    image = serializers.ImageField(allow_null=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    affiliate_commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    estimated_commission = serializers.DecimalField(max_digits=12, decimal_places=2)


class AffiliateCommissionSerializer(serializers.Serializer):
    """Mirrors my_conversions_view's queryset - read-only, one row per
    AffiliateCommission, only this affiliate's own numbers ever exposed."""
    id = serializers.UUIDField()
    order_reference = serializers.CharField(source="order.reference")
    product_name = serializers.CharField(source="order_item.product_name")
    order_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    status_label = serializers.CharField(source="get_status_display")
    created_at = serializers.DateTimeField()


class AffiliatePayoutSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AffiliatePayout
        fields = ("id", "amount", "status", "status_label", "reference", "created_at")
