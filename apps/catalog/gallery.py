"""
Shared handling of extra gallery images for the seller and admin
product APIs. A product has its primary `image` plus up to
ProductImage.MAX_IMAGES (8) gallery images = 9 images in total.

Multipart fields the React forms send:
    gallery_images     - zero or more image files (new uploads, repeated key)
    remove_gallery_ids - JSON list of existing ProductImage ids to delete

Both are optional, so older clients that send neither are unaffected.
"""
import json

from django import forms
from django.core.exceptions import ValidationError

from .models import ProductImage
from .variants import VariantValidationError

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB per image


def parse_gallery(product, data, files):
    """Validate and return (new_files, remove_ids). `product` is None on create."""
    new_files = files.getlist("gallery_images") if files is not None else []

    raw = data.get("remove_gallery_ids")
    remove_ids = []
    if raw:
        try:
            remove_ids = json.loads(raw) if isinstance(raw, str) else list(raw)
        except ValueError:
            raise VariantValidationError({"gallery_images": ["Invalid format."]})
        if not isinstance(remove_ids, list):
            raise VariantValidationError({"gallery_images": ["Invalid format."]})
    remove_ids = {str(i) for i in remove_ids}

    existing = 0
    if product is not None:
        existing = sum(1 for g in product.gallery_images.all() if str(g.id) not in remove_ids)

    if existing + len(new_files) > ProductImage.MAX_IMAGES:
        raise VariantValidationError({"gallery_images": [
            f"A product can have at most {ProductImage.MAX_IMAGES} extra images "
            f"({ProductImage.MAX_IMAGES + 1} including the main image)."
        ]})

    checker = forms.ImageField()
    for f in new_files:
        if f.size > MAX_IMAGE_BYTES:
            raise VariantValidationError({"gallery_images": [f"{f.name} is larger than 5 MB."]})
        try:
            checker.clean(f)
            f.seek(0)
        except ValidationError:
            raise VariantValidationError({"gallery_images": [f"{f.name} is not a valid image."]})

    return new_files, remove_ids


def save_gallery(product, new_files, remove_ids):
    if remove_ids:
        for g in product.gallery_images.all():
            if str(g.id) in remove_ids:
                g.delete(hard=True)
    if new_files:
        order = max([g.display_order for g in product.gallery_images.all()] + [-1]) + 1
        for offset, f in enumerate(new_files):
            ProductImage.objects.create(product=product, image=f, display_order=order + offset)
