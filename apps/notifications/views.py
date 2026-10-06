from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render

from .models import Notification


@login_required(login_url="accounts:login")
def notification_list(request):
    """
    Full notification history for the logged-in user, newest first.
    Marking as read is now an explicit action (see mark_read_view /
    mark_all_read_view below) rather than an automatic side effect of
    visiting this page - spec section 31 wants a real "mark as read"
    AJAX action, which only makes sense if visiting the list doesn't
    already silently clear everything first.
    """
    notifications = Notification.objects.filter(user=request.user)
    return render(request, "notifications/list.html", {"notifications": notifications})


@login_required(login_url="accounts:login")
def notification_redirect(request, pk):
    """
    Clicking a notification (e.g. from the nav dropdown) marks it read
    and sends the user to wherever it points, or back to the list if it
    has no target url.
    """
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])

    return redirect(notification.url or "notifications:list")


@login_required(login_url="accounts:login")
def mark_read_view(request, pk):
    """Spec section 31 - AJAX "mark as read", without navigating away like notification_redirect does."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required."}, status=405)

    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])

    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    return JsonResponse({"marked_read": True, "unread_count": unread_count})


@login_required(login_url="accounts:login")
def mark_all_read_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required."}, status=405)

    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"marked_read": True, "unread_count": 0})


@login_required(login_url="accounts:login")
def unread_count_view(request):
    """Spec section 31 - "incremental refresh": polled periodically to keep the nav bell badge live without a full page reload."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return JsonResponse({"unread_count": count})
