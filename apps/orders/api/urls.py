from django.urls import path

from . import views

app_name = "orders_api"

urlpatterns = [
    path("checkout/", views.checkout_summary_view, name="checkout_summary"),
    path("orders/checkout/", views.submit_checkout_view, name="submit_checkout"),
    path("orders/", views.order_list_view, name="order_list"),
    path("orders/<str:reference>/", views.order_detail_view, name="order_detail"),
    path("orders/<str:reference>/status/", views.order_status_view, name="order_status"),
    path(
        "orders/<str:reference>/items/<uuid:item_id>/refund/",
        views.request_refund_view,
        name="request_refund",
    ),
    path(
        "orders/<str:reference>/download/<uuid:item_id>/",
        views.download_product_view,
        name="download_product",
    ),
]
