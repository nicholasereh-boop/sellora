import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchCart() {
  const { data } = await apiClient.get("cart/");
  return data.data;
}

export async function addCartItem({ productId, quantity = 1 }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("cart/items/", {
    product: productId,
    quantity,
  });
  return data.data;
}

export async function updateCartItem(itemId, quantity) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch(`cart/items/${itemId}/`, { quantity });
  return data.data;
}

export async function removeCartItem(itemId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.delete(`cart/items/${itemId}/`);
  return data.data;
}
