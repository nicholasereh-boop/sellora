import apiClient from "./client";

export async function fetchProducts({ category, search, page } = {}) {
  const { data } = await apiClient.get("catalog/products/", {
    params: { category, search, page },
  });
  // DRF's PageNumberPagination wraps the list in {count, next, previous, results}
  return data.data ?? data;
}

// `ref` is an affiliate referral code from the page's ?ref= query. Django's
// AffiliateTrackingMiddleware watches for it on API requests too, so the
// click is recorded and the attribution cookie set even though the product
// page itself is now served by React.
export async function fetchProduct(slug, ref) {
  const { data } = await apiClient.get(`catalog/products/${slug}/`, {
    params: ref ? { ref } : undefined,
  });
  return data.data;
}

export async function fetchRecentlyViewed(exclude) {
  const { data } = await apiClient.get("catalog/recently-viewed/", {
    params: { exclude },
  });
  return data.data;
}

export async function fetchCategories() {
  const { data } = await apiClient.get("catalog/categories/");
  return data.data ?? data;
}

export async function submitReview(slug, { rating, comment }) {
  const { data } = await apiClient.post(`catalog/products/${slug}/reviews/`, {
    rating,
    comment,
  });
  return data.data;
}
