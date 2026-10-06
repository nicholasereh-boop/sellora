from django.urls import path

from . import views

app_name = "notifications_api"

urlpatterns = [
    path("", views.notification_list_view, name="list"),
    path("unread-count/", views.unread_count_view, name="unread_count"),
    path("read-all/", views.mark_all_read_view, name="mark_all_read"),
    path("<uuid:pk>/read/", views.mark_read_view, name="mark_read"),
]
