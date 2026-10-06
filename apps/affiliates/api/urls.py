from django.urls import path

from . import views

app_name = "affiliates_api"

urlpatterns = [
    path("application/", views.application_view, name="application"),
    path("dashboard/", views.dashboard_view, name="dashboard"),

    path("links/", views.links_view, name="links"),
    path("links/<uuid:link_id>/", views.link_detail_view, name="link_detail"),
    path("links/generate/<uuid:product_id>/", views.generate_link_view, name="generate_link"),

    path("conversions/", views.conversions_view, name="conversions"),
    path("analytics/", views.analytics_view, name="analytics"),

    path("bank-details/", views.bank_details_view, name="bank_details"),
    path("payouts/", views.payouts_view, name="payouts"),
    path("payouts/request/", views.payout_request_view, name="payout_request"),
]
