from django.urls import path

from . import views

app_name = "cart_api"

urlpatterns = [
    path("", views.cart_detail_view, name="cart_detail"),
    path("items/", views.add_item_view, name="add_item"),
    path("items/<uuid:item_id>/", views.item_detail_view, name="item_detail"),
]
