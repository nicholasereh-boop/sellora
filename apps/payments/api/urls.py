from django.urls import path

from . import views

app_name = "payments_api"

urlpatterns = [
    path("initiate/<str:order_reference>/", views.initiate_payment_view, name="initiate"),
]
