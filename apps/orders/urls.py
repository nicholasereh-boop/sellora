from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("<str:reference>/download/<uuid:item_id>/", views.download_product, name="download_product"),
]
