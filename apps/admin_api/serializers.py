from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.affiliates.models import AffiliateProfile
from apps.catalog.api.serializers import (
    ProductColorVariantSerializer, ProductImageSerializer, ProductSizeVariantSerializer, rating_summary,
)
from apps.catalog.models import Product
from apps.riders.models import RiderProfile
from apps.sellers.models import SellerProfile

from ..models import ContactMessage, Order

User = get_user_model()


class AdminProductSerializer(serializers.ModelSerializer):
    """
    Mirrors apps.forms.ProductForm's exact field set - the admin
    add/edit product pages don't set category or seller (that's the
    existing behavior of this legacy form, unchanged here).
    """

    gallery_images = ProductImageSerializer(many=True, read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    size_variants = ProductSizeVariantSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "description", "price", "image",
            "product_type", "digital_file", "stock", "is_active",
            "gallery_images", "color_variants", "size_variants", "average_rating", "review_count",
        )

    def get_average_rating(self, obj):
        return rating_summary(obj)[0]

    def get_review_count(self, obj):
        return rating_summary(obj)[1]


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_active", "is_staff", "is_superuser", "date_joined")


class AdminOrderSerializer(serializers.ModelSerializer):
    """
    The legacy `Order` model (apps.models.Order) - a separate, older
    model from apps.orders.models.Order (the real multi-item checkout
    system every other part of this migration uses). Kept separate
    intentionally, matching admin_orders/OrderAdminHelper's own
    comments about not conflating the two.
    """

    amount_display = serializers.SerializerMethodField()
    purchase_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "reference", "email", "full_name", "phone", "amount",
            "amount_display", "status", "verified", "purchase_completed",
            "purchase_status", "created_at",
        )

    def get_amount_display(self, obj):
        return f"\u20a6{obj.amount:,}"

    def get_purchase_status(self, obj):
        if getattr(obj, "verified", False) and not getattr(obj, "purchase_completed", False):
            return "Recovery Needed"
        return "Completed"


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ("id", "name", "email", "subject", "message", "is_read", "created_at")


# ---------------------------------------------------------------------------
# Pending-application rows for the admin dashboard's "Needs attention"
# cards. One serializer per role rather than a shared base class - the
# fields genuinely differ (store vs. promotional channels vs. vehicle
# type) and the dashboard already treats sellers/affiliates/riders as
# separate concerns throughout this file.
# ---------------------------------------------------------------------------

class PendingSellerApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            "id", "username", "store_name", "store_description",
            "phone", "business_email", "created_at",
        )


class PendingAffiliateApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AffiliateProfile
        fields = (
            "id", "username", "full_name", "phone",
            "contact_email", "promotional_channels", "created_at",
        )


class PendingRiderApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = RiderProfile
        fields = (
            "id", "username", "full_name", "phone",
            "contact_email", "service_area", "vehicle_type", "created_at",
        )
