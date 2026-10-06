"""
Shared parsing/saving of colour and size variants for the seller and
admin product APIs, so both behave identically.

The React forms send each list as a JSON string in the multipart body:
    color_variants = '[{"name": "Navy", "hex_code": "#1D2A5B"}]'
    size_variants  = '["S", "M", "L", "XL"]'

A key that is absent means "leave that list alone" (so PATCH requests
from older clients keep working); a key that is present replaces the
product's list with exactly what was sent.
"""
import json
import re

from .models import ProductColorVariant, ProductSizeVariant

_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
MAX_VARIANTS = 20


class VariantValidationError(Exception):
    def __init__(self, fields):
        super().__init__("Invalid variants.")
        self.fields = fields


def _load_list(data, key):
    raw = data.get(key)
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw) if raw.strip() else []
        except ValueError:
            raise VariantValidationError({key: ["Invalid format."]})
    if not isinstance(raw, list):
        raise VariantValidationError({key: ["Must be a list."]})
    if len(raw) > MAX_VARIANTS:
        raise VariantValidationError({key: [f"No more than {MAX_VARIANTS} allowed."]})
    return raw


def parse_variants(data):
    """Return (colors, sizes); either is None when the client didn't send it."""
    colors = _load_list(data, "color_variants")
    sizes = _load_list(data, "size_variants")

    clean_colors = None
    if colors is not None:
        clean_colors, seen = [], set()
        for item in colors:
            name = str(item.get("name", "")).strip() if isinstance(item, dict) else ""
            hex_code = str(item.get("hex_code", "")).strip() if isinstance(item, dict) else ""
            if not name or len(name) > 50:
                raise VariantValidationError({"color_variants": ["Each colour needs a name (max 50 characters)."]})
            if hex_code and not _HEX.match(hex_code):
                raise VariantValidationError({"color_variants": ["Colour codes must look like #1D4ED8."]})
            if name.casefold() in seen:
                continue
            seen.add(name.casefold())
            clean_colors.append({"name": name, "hex_code": hex_code})

    clean_sizes = None
    if sizes is not None:
        clean_sizes, seen = [], set()
        for item in sizes:
            label = str(item).strip()
            if not label or len(label) > 20:
                raise VariantValidationError({"size_variants": ["Each size needs a label (max 20 characters)."]})
            if label.casefold() in seen:
                continue
            seen.add(label.casefold())
            clean_sizes.append(label)

    return clean_colors, clean_sizes


def sync_variants(product, colors, sizes):
    """Make the product's variants match the parsed lists (None = untouched)."""
    if colors is not None:
        existing = {v.name.casefold(): v for v in product.color_variants.all()}
        wanted = {c["name"].casefold() for c in colors}
        for key, variant in existing.items():
            if key not in wanted:
                variant.delete(hard=True)
        for c in colors:
            variant = existing.get(c["name"].casefold())
            if variant:
                if variant.hex_code != c["hex_code"] or variant.name != c["name"]:
                    variant.name, variant.hex_code = c["name"], c["hex_code"]
                    variant.save()
            else:
                ProductColorVariant.objects.create(product=product, **c)

    if sizes is not None:
        existing = {v.label.casefold(): v for v in product.size_variants.all()}
        wanted = {s.casefold() for s in sizes}
        for key, variant in existing.items():
            if key not in wanted:
                variant.delete(hard=True)
        for label in sizes:
            if label.casefold() not in existing:
                ProductSizeVariant.objects.create(product=product, label=label)
