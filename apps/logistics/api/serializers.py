from rest_framework import serializers

from ..models import SellerFulfillment


class SellerFulfillmentSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(source="order.reference", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    package_reference = serializers.SerializerMethodField()

    class Meta:
        model = SellerFulfillment
        fields = (
            "id", "order_reference", "status", "status_label",
            "ready_at", "created_at", "package_reference",
        )

    def get_package_reference(self, obj):
        package = obj.packages.order_by("-created_at").first()
        return package.reference if package else None
