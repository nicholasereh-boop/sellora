from django.urls import path

from . import views

app_name = "riders_api"

urlpatterns = [
    path("application/", views.application_view, name="application"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("availability/", views.toggle_availability_view, name="toggle_availability"),
    path("active-delivery/", views.active_delivery_view, name="active_delivery"),
    path("activity/", views.activity_view, name="activity"),
    path("profile/", views.profile_view, name="profile"),
    path("earnings/", views.earnings_view, name="earnings"),
    path("bank-details/", views.bank_details_view, name="bank_details"),
]
