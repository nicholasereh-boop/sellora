// Shared helpers for colour/size variants (seller form, admin form,
// storefront). Sizes come back from the API in no guaranteed order, so
// the storefront and forms always sort them the same way.

export const SIZE_PRESETS = ["S", "M", "L", "XL"];

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL"];

export function sortSizes(labels = []) {
  return [...labels].sort((a, b) => {
    const ra = SIZE_ORDER.indexOf(a.toUpperCase());
    const rb = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ra !== -1 && rb !== -1) return ra - rb;
    if (ra !== -1) return -1;
    if (rb !== -1) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

// What the seller/admin API expects: each list as a JSON string in the
// multipart body. Blank rows are dropped here so they never reach the
// server's validation.
export function buildVariantFields(colors, sizes) {
  const cleanColors = colors
    .map((c) => ({ name: c.name.trim(), hex_code: c.hex_code || "" }))
    .filter((c) => c.name);
  const cleanSizes = sizes.map((s) => s.trim()).filter(Boolean);
  return {
    color_variants: JSON.stringify(cleanColors),
    size_variants: JSON.stringify(cleanSizes),
  };
}

// API product -> the editable shapes the form keeps in state.
export function variantsFromProduct(product) {
  return {
    colors: (product.color_variants ?? []).map((c) => ({ name: c.name, hex_code: c.hex_code || "" })),
    sizes: sortSizes((product.size_variants ?? []).map((s) => s.label)),
  };
}
