from django.urls import path

from . import views

app_name = "logistics_api"

urlpatterns = [
    path("pickup-tasks/", views.pickup_task_list_view, name="pickup_task_list"),
    path("pickup-tasks/<uuid:task_id>/accept/", views.accept_pickup_task_view, name="accept_pickup_task"),
    path("pickup-tasks/<uuid:task_id>/collect/", views.mark_collected_view, name="mark_collected"),
    path("pickup-tasks/<uuid:task_id>/exception/", views.report_pickup_exception_view, name="report_pickup_exception"),

    path("delivery-tasks/", views.delivery_task_list_view, name="delivery_task_list"),
    path("delivery-tasks/<uuid:task_id>/deliver/", views.mark_delivered_view, name="mark_delivered"),

    path("fulfillments/", views.fulfillment_list_view, name="fulfillment_list"),
    path("fulfillments/<uuid:fulfillment_id>/ready/", views.mark_fulfillment_ready_view, name="mark_fulfillment_ready"),
]
