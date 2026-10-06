import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchCheckoutSummary(deliveryMethod) {
  const { data } = await apiClient.get("checkout/", {
    params: { delivery_method: deliveryMethod },
  });
  return data.data;
}

export async function submitCheckout(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("orders/checkout/", payload);
  return data.data; // { reference }
}

export async function fetchOrders() {
  const { data } = await apiClient.get("orders/");
  return data.data;
}

export async function fetchOrder(reference) {
  const { data } = await apiClient.get(`orders/${reference}/`);
  return data.data;
}

export async function fetchOrderStatus(reference) {
  const { data } = await apiClient.get(`orders/${reference}/status/`);
  return data.data;
}

export async function requestRefund(reference, itemId, { reasonCategory, reason }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`orders/${reference}/items/${itemId}/refund/`, {
    reason_category: reasonCategory,
    reason,
  });
  return data.data;
}
