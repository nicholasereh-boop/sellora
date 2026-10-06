from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.catalog.models import Product

from ..models import CartItem
from ..services import get_or_create_cart
from .serializers import CartSerializer


def _cart_response(cart, extra=None):
    data = CartSerializer(cart).data
    if extra:
        data.update(extra)
    return Response({"success": True, "data": data})


@api_view(["GET"])
@permission_classes([AllowAny])  # guest carts are supported, same as the template views
def cart_detail_view(request):
    cart = get_or_create_cart(request)
    return _cart_response(cart)


@api_view(["POST"])
@permission_classes([AllowAny])
def add_item_view(request):
    """POST /api/cart/items/  body: {product: <uuid>, quantity: <int>}"""
    product_id = request.data.get("product")
    try:
        quantity = max(1, int(request.data.get("quantity", 1)))
    except (TypeError, ValueError):
        quantity = 1

    product = Product.active.filter(pk=product_id, is_active=True).first()
    if product is None:
        return Response(
            {"success": False, "error": {"code": "NOT_FOUND", "message": "Product not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )

    cart = get_or_create_cart(request)
    item, created = CartItem.objects.get_or_create(
        cart=cart, product=product, defaults={"quantity": quantity},
    )
    if not created:
        item.quantity += quantity
        item.save()

    return _cart_response(cart, {"message": f"{product.name} added to cart."})


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
def item_detail_view(request, item_id):
    """
    PATCH  /api/cart/items/{id}/  body: {quantity: <int>}
    DELETE /api/cart/items/{id}/
    """
    cart = get_or_create_cart(request)
    item = cart.items.filter(pk=item_id).first()
    if item is None:
        return Response(
            {"success": False, "error": {"code": "NOT_FOUND", "message": "Cart item not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        item.delete(hard=True)
        return _cart_response(cart, {"message": "Item removed."})

    try:
        quantity = int(request.data.get("quantity"))
    except (TypeError, ValueError):
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "quantity must be an integer."}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if quantity < 1:
        item.delete(hard=True)
        return _cart_response(cart, {"message": "Item removed."})

    item.quantity = quantity
    item.save()
    return _cart_response(cart)
