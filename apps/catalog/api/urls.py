from django.urls import path

from . import views

app_name = "catalog_api"

urlpatterns = [
    path("products/", views.ProductListView.as_view(), name="product_list"),
    path("recently-viewed/", views.recently_viewed_view, name="recently_viewed"),
    path("products/<slug:slug>/", views.ProductDetailView.as_view(), name="product_detail"),
    path("products/<slug:slug>/reviews/", views.add_review_view, name="add_review"),
    path("categories/", views.CategoryListView.as_view(), name="category_list"),
]
