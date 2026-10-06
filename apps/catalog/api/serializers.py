from django.conf import settings
from rest_framework import serializers

from ..models import Category, Product, ProductColorVariant, ProductImage, ProductSizeVariant, Review


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "display_order")


class ProductColorVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductColorVariant
        fields = ("id", "name", "hex_code")


class ProductSizeVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSizeVariant
        fields = ("id", "label")


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "username", "rating", "comment", "created_at")
        read_only_fields = ("id", "username", "created_at")

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


def live_reviews(product):
    """Reviews that haven't been soft-deleted (uses the prefetch if present)."""
    return [r for r in product.reviews.all() if r.deleted_at is None]


def rating_summary(product):
    ratings = [r.rating for r in live_reviews(product)]
    average = round(sum(ratings) / len(ratings), 1) if ratings else None
    return average, len(ratings)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight shape for /api/catalog/products/ (list/grid pages)."""

    category = CategorySerializer(read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    size_variants = ProductSizeVariantSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "price", "image",
            "product_type", "stock", "category",
            "color_variants", "size_variants", "average_rating", "review_count",
        )

    def get_average_rating(self, obj):
        return rating_summary(obj)[0]

    def get_review_count(self, obj):
        return rating_summary(obj)[1]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full shape for /api/catalog/products/{slug}/."""

    category = CategorySerializer(read_only=True)
    gallery_images = ProductImageSerializer(many=True, read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    size_variants = ProductSizeVariantSerializer(many=True, read_only=True)
    is_digital = serializers.BooleanField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "description", "price", "image",
            "product_type", "is_digital", "stock", "is_active",
            "category", "gallery_images", "color_variants", "size_variants",
            "average_rating", "review_count", "reviews",
        )

    def get_reviews(self, obj):
        return ReviewSerializer(live_reviews(obj), many=True).data

    def get_average_rating(self, obj):
        ratings = [r.rating for r in obj.reviews.all()]
        return round(sum(ratings) / len(ratings), 1) if ratings else None

    def get_review_count(self, obj):
        return len(obj.reviews.all()) if obj.reviews.all() else 0
