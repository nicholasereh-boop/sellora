from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list_view(request):
    """GET /api/notifications/ - newest first, same queryset as the template view."""
    notifications = Notification.objects.filter(user=request.user)
    return Response({"success": True, "data": NotificationSerializer(notifications, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read_view(request, pk):
    """POST /api/notifications/{pk}/read/"""
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])

    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({"success": True, "data": {"unread_count": unread_count}})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    """POST /api/notifications/read-all/"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"success": True, "data": {"unread_count": 0}})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count_view(request):
    """GET /api/notifications/unread-count/ - polled for the nav bell badge."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({"success": True, "data": {"unread_count": count}})
