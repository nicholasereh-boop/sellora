from django.urls import path

from . import views

app_name = "admin_api"

urlpatterns = [
    path("auth/login/", views.admin_login_view, name="login"),
    path("auth/logout/", views.admin_logout_view, name="logout"),
    path("auth/me/", views.admin_me_view, name="me"),

    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("analytics/", views.analytics_view, name="analytics"),

    path("orders/", views.order_list_view, name="order_list"),
    path("orders/<uuid:pk>/recover/", views.recover_order_view, name="recover_order"),

    path("products/", views.product_list_create_view, name="product_list_create"),
    path("products/<uuid:pk>/", views.product_detail_view, name="product_detail"),

    path("users/", views.user_list_view, name="user_list"),
    path("messages/", views.message_list_view, name="message_list"),

    # Application review (Needs attention cards) - approve/reject call
    # the same service functions as the Django admin bulk actions.
    path("applications/sellers/", views.pending_seller_applications_view, name="pending_sellers"),
    path("applications/sellers/<uuid:pk>/approve/", views.approve_seller_application_view, name="approve_seller"),
    path("applications/sellers/<uuid:pk>/reject/", views.reject_seller_application_view, name="reject_seller"),

    path("applications/affiliates/", views.pending_affiliate_applications_view, name="pending_affiliates"),
    path("applications/affiliates/<uuid:pk>/approve/", views.approve_affiliate_application_view, name="approve_affiliate"),
    path("applications/affiliates/<uuid:pk>/reject/", views.reject_affiliate_application_view, name="reject_affiliate"),

    path("applications/riders/", views.pending_rider_applications_view, name="pending_riders"),
    path("applications/riders/<uuid:pk>/approve/", views.approve_rider_application_view, name="approve_rider"),
    path("applications/riders/<uuid:pk>/reject/", views.reject_rider_application_view, name="reject_rider"),
]
