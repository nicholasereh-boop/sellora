from django.urls import path

from . import views

app_name = "sellers_api"

urlpatterns = [
    path("application/", views.application_view, name="application"),
    path("dashboard/", views.dashboard_view, name="dashboard"),

    path("products/", views.product_list_create_view, name="product_list_create"),
    path("products/<uuid:pk>/", views.product_detail_view, name="product_detail"),
    path("products/<uuid:pk>/toggle-active/", views.product_toggle_active_view, name="product_toggle_active"),
    path("products/<uuid:pk>/stock/", views.product_update_stock_view, name="product_update_stock"),

    path("orders/", views.order_item_list_view, name="order_item_list"),
    path("orders/<uuid:item_id>/fulfillment/", views.update_fulfillment_status_view, name="update_fulfillment"),

    path("store-settings/", views.store_settings_view, name="store_settings"),
    path("bank-details/", views.bank_details_view, name="bank_details"),

    path("payouts/", views.payouts_view, name="payouts"),
    path("payouts/request/", views.payout_request_view, name="payout_request"),

    # Public storefront (roadmap Phase 15) - no auth required, unlike
    # everything above this line.
    path("store/<slug:slug>/", views.public_store_view, name="public_store"),
    path("store/<slug:slug>/products/", views.PublicStoreProductListView.as_view(), name="public_store_products"),
]
