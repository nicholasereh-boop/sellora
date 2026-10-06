from rest_framework import serializers

from ..models import Order, OrderItem, Refund, ShippingAddress


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = (
            "address_line1", "address_line2", "city",
            "state", "postal_code", "country",
        )


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    seller_name = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    is_digital = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id", "product", "product_slug", "product_name", "unit_price",
            "quantity", "seller_name", "subtotal", "is_digital",
        )

    def get_seller_name(self, obj):
        return obj.seller.store_name if obj.seller else "This Store"

    def get_subtotal(self, obj):
        return obj.unit_price * obj.quantity

    def get_is_digital(self, obj):
        return bool(obj.product and obj.product.is_digital)


class RefundSerializer(serializers.ModelSerializer):
    order_item_id = serializers.UUIDField(source="order_item.id", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Refund
        fields = (
            "id", "order_item_id", "status", "status_label",
            "reason_category", "reason", "created_at",
        )


class OrderListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "reference", "status", "status_label", "total",
            "created_at", "is_paid",
        )


class OrderDetailSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = ShippingAddressSerializer(read_only=True)
    refunds = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "reference", "status", "status_label", "email", "full_name",
            "phone", "delivery_method", "subtotal", "shipping_fee", "total",
            "created_at", "is_paid", "items", "shipping_address", "refunds",
        )

    def get_refunds(self, obj):
        qs = Refund.objects.filter(order_item__order=obj).select_related("order_item")
        return RefundSerializer(qs, many=True).data
