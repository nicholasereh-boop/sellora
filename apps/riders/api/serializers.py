from rest_framework import serializers

from apps.logistics.models import DeliveryTask, PickupTask

from ..models import RiderEarning, RiderProfile


class RiderProfileSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    vehicle_type_label = serializers.CharField(source="get_vehicle_type_display", read_only=True)

    class Meta:
        model = RiderProfile
        fields = (
            "full_name", "phone", "contact_email", "service_area", "vehicle_type",
            "vehicle_type_label", "status", "status_label", "rejection_reason",
            "verified", "is_available",
        )
        read_only_fields = ("status", "status_label", "rejection_reason", "verified")


class RiderBankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiderProfile
        fields = ("bank_code", "bank_name", "bank_account_number", "bank_account_name")


class RiderEarningSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    order_reference = serializers.CharField(source="order.reference", read_only=True)

    class Meta:
        model = RiderEarning
        fields = ("id", "order_reference", "leg", "amount", "status", "status_label", "created_at")


class PickupTaskSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(source="package.fulfillment.order.reference", read_only=True)
    seller_name = serializers.CharField(source="package.fulfillment.seller.store_name", read_only=True)
    seller_phone = serializers.CharField(source="package.fulfillment.seller.phone", read_only=True)
    package_reference = serializers.CharField(source="package.reference", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PickupTask
        fields = (
            "id", "order_reference", "package_reference", "seller_name", "seller_phone",
            "pickup_address", "pickup_contact_phone", "status", "status_label",
            "requested_at", "collected_at",
        )


class DeliveryTaskSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(source="delivery.order.reference", read_only=True)
    customer_name = serializers.CharField(source="delivery.order.full_name", read_only=True)
    customer_phone = serializers.CharField(source="delivery.order.phone", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DeliveryTask
        fields = (
            "id", "order_reference", "customer_name", "customer_phone",
            "status", "status_label", "created_at", "delivered_at", "failure_reason",
        )
