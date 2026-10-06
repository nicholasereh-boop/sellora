import apiClient, { ensureCsrfCookie } from "./client";

/**
 * Custom admin area API (roadmap Phase 16). This is NOT Django's own
 * /admin/ (django.contrib.admin) - that stays exactly where it is and
 * is never touched from React. Everything here is /api/admin/*, every
 * endpoint of which enforces is_staff/is_superuser on the Django side;
 * the React route guard is only UX.
 */

export async function adminLogin({ username, password }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("admin/auth/login/", { username, password });
  return data.data;
}

export async function adminLogout() {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("admin/auth/logout/");
  return data.data;
}

// null = "this session isn't staff" (anonymous and customer sessions
// both get 401/403), so the route guard can redirect instead of erroring.
export async function fetchAdminMe() {
  try {
    const { data } = await apiClient.get("admin/auth/me/");
    return data.data;
  } catch (error) {
    if ([401, 403].includes(error.response?.status)) return null;
    throw error;
  }
}

export async function fetchAdminDashboard() {
  const { data } = await apiClient.get("admin/dashboard/");
  return data.data;
}

export async function fetchAdminAnalytics() {
  const { data } = await apiClient.get("admin/analytics/");
  return data.data;
}

export async function fetchAdminOrders() {
  const { data } = await apiClient.get("admin/orders/");
  return data.data;
}

export async function recoverAdminOrder(id) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`admin/orders/${id}/recover/`);
  return data.data;
}

export async function fetchAdminProducts() {
  const { data } = await apiClient.get("admin/products/");
  return data.data;
}

export async function fetchAdminProduct(id) {
  const { data } = await apiClient.get(`admin/products/${id}/`);
  return data.data;
}

export async function createAdminProduct(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("admin/products/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function updateAdminProduct(id, formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch(`admin/products/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function deleteAdminProduct(id) {
  await ensureCsrfCookie();
  const { data } = await apiClient.delete(`admin/products/${id}/`);
  return data.data;
}

export async function fetchAdminUsers() {
  const { data } = await apiClient.get("admin/users/");
  return data.data;
}

export async function fetchAdminMessages() {
  const { data } = await apiClient.get("admin/messages/");
  return data.data;
}

// Application review (Needs attention cards). One function per action,
// parameterized by role ("sellers" | "affiliates" | "riders") rather
// than three near-identical copies - the endpoints themselves are
// already role-specific on the Django side.
export async function fetchPendingApplications(role) {
  const { data } = await apiClient.get(`admin/applications/${role}/`);
  return data.data;
}

export async function approveApplication(role, id) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`admin/applications/${role}/${id}/approve/`);
  return data.data;
}

export async function rejectApplication(role, id, reason) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`admin/applications/${role}/${id}/reject/`, { reason });
  return data.data;
}
