"""
KYC API serializers (roadmap Phase 13).

Per the roadmap's explicit rules for this phase: "return only the
fields React actually needs." None of these serializers include
`id_document_number` or `drivers_license_number` - those are
write-only, submitted via the form and encrypted at rest by
EncryptedCharField, and never read back out over the API. React shows
"on file: yes/no" via the `has_*` booleans instead of the real value,
so there's nothing sensitive sitting in a browser tab, React Query
cache, or (were it ever misused) localStorage.
"""
from rest_framework import serializers

from .. import models


class _KYCStatusMixin(serializers.Serializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    is_confirmed = serializers.BooleanField(read_only=True)


class BuyerKYCSerializer(_KYCStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = models.BuyerKYC
        fields = (
            "full_name", "phone", "address_line", "city", "state", "country",
            "status", "status_label", "is_confirmed",
            "submitted_at", "reviewed_at", "rejection_reason",
        )
        read_only_fields = ("status", "submitted_at", "reviewed_at", "rejection_reason")


class SellerKYCSerializer(_KYCStatusMixin, serializers.ModelSerializer):
    id_document_type_label = serializers.CharField(source="get_id_document_type_display", read_only=True)
    has_id_document = serializers.SerializerMethodField()

    class Meta:
        model = models.SellerKYC
        fields = (
            "business_type", "business_category",
            "business_address_line", "business_city", "business_state", "business_country",
            "contact_phone", "contact_email",
            "id_document_type", "id_document_type_label", "has_id_document",
            "status", "status_label", "is_confirmed",
            "submitted_at", "reviewed_at", "rejection_reason",
        )
        read_only_fields = ("status", "submitted_at", "reviewed_at", "rejection_reason")

    def get_has_id_document(self, obj):
        return bool(obj.id_document_file)


class AffiliateKYCSerializer(_KYCStatusMixin, serializers.ModelSerializer):
    id_document_type_label = serializers.CharField(source="get_id_document_type_display", read_only=True)
    has_id_document = serializers.SerializerMethodField()

    class Meta:
        model = models.AffiliateKYC
        fields = (
            "display_name", "business_type",
            "address_line", "city", "state", "country",
            "contact_phone", "contact_email",
            "id_document_type", "id_document_type_label", "has_id_document",
            "status", "status_label", "is_confirmed",
            "submitted_at", "reviewed_at", "rejection_reason",
        )
        read_only_fields = ("status", "submitted_at", "reviewed_at", "rejection_reason")

    def get_has_id_document(self, obj):
        return bool(obj.id_document_file)


class RiderKYCSerializer(_KYCStatusMixin, serializers.ModelSerializer):
    id_document_type_label = serializers.CharField(source="get_id_document_type_display", read_only=True)
    has_id_document = serializers.SerializerMethodField()
    has_drivers_license = serializers.SerializerMethodField()

    class Meta:
        model = models.RiderKYC
        fields = (
            "date_of_birth", "operating_location",
            "emergency_contact_name", "emergency_contact_phone",
            "id_document_type", "id_document_type_label", "has_id_document",
            "drivers_license_expiry", "has_drivers_license",
            "vehicle_make", "vehicle_model", "vehicle_color", "plate_number",
            "status", "status_label", "is_confirmed",
            "submitted_at", "reviewed_at", "rejection_reason",
        )
        read_only_fields = ("status", "submitted_at", "reviewed_at", "rejection_reason")

    def get_has_id_document(self, obj):
        return bool(obj.id_document_file)

    def get_has_drivers_license(self, obj):
        return bool(obj.drivers_license_file)
