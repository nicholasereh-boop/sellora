from django.urls import path
from .views import login_view, admin_dashboard, logout_view, custom_admin_view, signup_view, verify_email
from . import views
from django.conf import settings




urlpatterns = [
    # 'shop' moved to apps.catalog (product_list/product_detail) - see
    # config/urls.py. Old buy_now/checkout/download_product/verify_payment/
    # payment_success/paystack_webhook retired - see docs/28_DECISIONS.md.

    # ================= admin dashboard ==========
    path('custom_login/', login_view, name='custom_login'),
    path('custom_signup/', signup_view, name='custom_signup'),
    path('base/', custom_admin_view, name='custom_admin'),
    path('admin-panel/', admin_dashboard, name='admin_dashboard'),
    path('admin-panel/analytics/', views.admin_analytics, name='admin_analytics'),
    path('custom_logout/', logout_view, name='custom_logout'),
    path(
        'verify-email/<uidb64>/<token>/',
        verify_email,
        name='verify_email'
    ),


    
    path('dashboard/orders/', views.admin_orders, name='admin_orders'),
    path('dashboard/products/', views.admin_products, name='admin_products'),
    path('admin-panel/products/add/', views.add_product, name='add_product'),
    path('admin-panel/products/edit/<uuid:pk>/', views.edit_product, name='edit_product'),
    path('dashboard/users/', views.admin_users, name='admin_users'),
    path('dashboard/messages/', views.admin_messages, name='admin_messages'),
    path('dashboard/product/delete/<uuid:pk>/', views.delete_product, name='delete_product'),
]