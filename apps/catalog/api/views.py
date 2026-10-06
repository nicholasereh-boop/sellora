from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import Category, Product
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer, ReviewSerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/catalog/categories/"""
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None
    queryset = Category.active.all()


class ProductListView(generics.ListAPIView):
    """
    GET /api/catalog/products/?category=<slug>

    Same queryset/filter the existing catalog:product_list template view
    uses (Product.active, is_active=True, optional ?category= filter) -
    the API doesn't add or change filtering behavior.
    """
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Product.active.filter(is_active=True).select_related("category").prefetch_related(
            "color_variants", "size_variants", "reviews"
        )
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/catalog/products/{slug}/"""
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Product.active.select_related("seller", "category").prefetch_related(
            "gallery_images", "color_variants", "size_variants", "reviews"
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Mirrors the template view's recently-viewed session tracking,
        # so the behavior is identical between the two frontends.
        viewed = request.session.get("recently_viewed_products", [])
        viewed = [s for s in viewed if s != instance.slug]
        viewed.insert(0, instance.slug)
        request.session["recently_viewed_products"] = viewed[:8]
        return Response({"success": True, "data": self.get_serializer(instance).data})


@api_view(["GET"])
@permission_classes([AllowAny])
def recently_viewed_view(request):
    """
    GET /api/catalog/recently-viewed/?exclude=<slug>

    The products this visitor opened most recently (most recent first),
    read from the same session list ProductDetailView maintains. Only
    products that are still active/visible are returned. `exclude` lets
    the detail page leave out the product being viewed.
    """
    slugs = request.session.get("recently_viewed_products", [])
    exclude = request.query_params.get("exclude")
    slugs = [s for s in slugs if s != exclude]

    products = Product.active.filter(slug__in=slugs, is_active=True).select_related(
        "category"
    ).prefetch_related("color_variants", "size_variants", "reviews")
    by_slug = {p.slug: p for p in products}
    ordered = [by_slug[s] for s in slugs if s in by_slug]
    return Response({"success": True, "data": ProductListSerializer(ordered, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_review_view(request, slug):
    """POST /api/catalog/products/{slug}/reviews/"""
    try:
        product = Product.active.get(slug=slug, is_active=True)
    except Product.DoesNotExist:
        return Response(
            {"success": False, "error": {"code": "NOT_FOUND", "message": "Product not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "Please correct the highlighted fields.",
             "fields": serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer.save(product=product, user=request.user)
    return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)
