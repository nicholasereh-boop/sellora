from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.notification_list, name="list"),
    path("<uuid:pk>/go/", views.notification_redirect, name="redirect"),
    path("<uuid:pk>/mark-read/", views.mark_read_view, name="mark_read"),
    path("mark-all-read/", views.mark_all_read_view, name="mark_all_read"),
    path("unread-count/", views.unread_count_view, name="unread_count"),
]
