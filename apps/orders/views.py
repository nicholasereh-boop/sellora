"""
Orders - the only non-API route left here is the digital-file download
(a file response, not a page). Everything else the buyer sees is served
by apps/orders/api/ and rendered by the React app.
"""
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Order, OrderItem


def download_product(request, reference, item_id):
    """
    Digital file download for a purchased item.

    Requires: a signed-in buyer, the order belongs to them, the order is
    paid, the item belongs to that order, and the product is a digital
    product with a file attached.
    """
    if not request.user.is_authenticated:
        return HttpResponse("Sign in to download this file.", status=401)

    order = get_object_or_404(Order, reference=reference, user=request.user)

    if not order.is_paid:
        return HttpResponse("This order hasn't been paid for yet.", status=403)

    item = get_object_or_404(OrderItem, pk=item_id, order=order)

    if item.product is None or not item.product.is_digital or not item.product.digital_file:
        return HttpResponse("This item isn't available for download.", status=404)

    response = HttpResponse(item.product.digital_file, content_type="application/octet-stream")
    filename = item.product.digital_file.name.split("/")[-1]
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
