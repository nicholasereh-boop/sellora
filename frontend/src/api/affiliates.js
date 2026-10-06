import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchAffiliateApplication() {
  const { data } = await apiClient.get("affiliates/application/");
  return data.data; // null if never applied
}

export async function submitAffiliateApplication(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("affiliates/application/", payload);
  return data.data;
}

export async function fetchAffiliateDashboard() {
  const { data } = await apiClient.get("affiliates/dashboard/");
  return data.data;
}

export async function fetchAffiliateLinks() {
  const { data } = await apiClient.get("affiliates/links/");
  return data.data; // { links, promotable_products }
}

export async function fetchAffiliateLink(linkId) {
  const { data } = await apiClient.get(`affiliates/links/${linkId}/`);
  return data.data;
}

export async function generateAffiliateLink(productId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`affiliates/links/generate/${productId}/`);
  return data.data;
}

export async function fetchAffiliateConversions({ status, page = 1 } = {}) {
  const { data } = await apiClient.get("affiliates/conversions/", { params: { status, page } });
  return data.data;
}

export async function fetchAffiliateAnalytics(days = 30) {
  const { data } = await apiClient.get("affiliates/analytics/", { params: { days } });
  return data.data;
}

export async function fetchAffiliateBankDetails() {
  const { data } = await apiClient.get("affiliates/bank-details/");
  return data.data;
}

export async function updateAffiliateBankDetails(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch("affiliates/bank-details/", payload);
  return data.data;
}

export async function fetchAffiliatePayouts() {
  const { data } = await apiClient.get("affiliates/payouts/");
  return data.data;
}

export async function requestAffiliatePayout(amount) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("affiliates/payouts/request/", { amount });
  return data.data;
}
