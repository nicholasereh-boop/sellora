import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchApplication() {
  const { data } = await apiClient.get("sellers/application/");
  return data.data; // null if never applied
}

export async function submitApplication(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("sellers/application/", payload);
  return data.data;
}

export async function fetchDashboard(revenuePeriod = "daily") {
  const { data } = await apiClient.get("sellers/dashboard/", {
    params: { revenue_period: revenuePeriod },
  });
  return data.data;
}

export async function fetchSellerProducts(page = 1) {
  const { data } = await apiClient.get("sellers/products/", { params: { page } });
  return data.data;
}

export async function createSellerProduct(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("sellers/products/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function fetchSellerProduct(id) {
  const { data } = await apiClient.get(`sellers/products/${id}/`);
  return data.data;
}

export async function updateSellerProduct(id, formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch(`sellers/products/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function deleteSellerProduct(id) {
  await ensureCsrfCookie();
  await apiClient.delete(`sellers/products/${id}/`);
}

export async function toggleProductActive(id) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`sellers/products/${id}/toggle-active/`);
  return data.data;
}

export async function updateProductStock(id, stock) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`sellers/products/${id}/stock/`, { stock });
  return data.data;
}

export async function fetchSellerOrders({ status, page = 1 } = {}) {
  const { data } = await apiClient.get("sellers/orders/", { params: { status, page } });
  return data.data;
}

export async function updateFulfillmentStatus(itemId, fulfillmentStatus) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`sellers/orders/${itemId}/fulfillment/`, {
    fulfillment_status: fulfillmentStatus,
  });
  return data.data;
}

export async function fetchStoreSettings() {
  const { data } = await apiClient.get("sellers/store-settings/");
  return data.data;
}

export async function updateStoreSettings(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch("sellers/store-settings/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function fetchBankDetails() {
  const { data } = await apiClient.get("sellers/bank-details/");
  return data.data;
}

export async function updateBankDetails(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch("sellers/bank-details/", payload);
  return data.data;
}

export async function fetchPayouts() {
  const { data } = await apiClient.get("sellers/payouts/");
  return data.data;
}

export async function requestPayout(amount) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("sellers/payouts/request/", { amount });
  return data.data;
}

// Public storefront (roadmap Phase 15) - no auth, no CSRF needed.
export async function fetchPublicStore(slug) {
  const { data } = await apiClient.get(`sellers/store/${slug}/`);
  return data.data;
}

export async function fetchPublicStoreProducts(slug, { q, sort, page = 1 } = {}) {
  const { data } = await apiClient.get(`sellers/store/${slug}/products/`, {
    params: { q, sort, page },
  });
  return data.data ?? data; // paginated: {count, next, previous, results}
}
