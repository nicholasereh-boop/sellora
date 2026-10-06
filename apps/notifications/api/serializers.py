from rest_framework import serializers

from ..models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "category", "category_label", "message", "url", "is_read", "created_at")
