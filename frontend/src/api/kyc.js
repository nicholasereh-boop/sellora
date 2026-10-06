import apiClient, { ensureCsrfCookie } from "./client";

/**
 * Roadmap Phase 13 (KYC) - handling notes:
 *
 * - GET responses never include id_document_number/drivers_license_number
 *   (the backend serializer omits them entirely - see
 *   apps.kyc.api.serializers's docstring). There is nothing sensitive to
 *   protect on read; only the one-time POST body carries it, straight
 *   to Django over HTTPS, never touching localStorage or console.log.
 * - No caller of these functions may log the `payload`/`formData`
 *   argument or the response body. React Query's cache (which holds
 *   whatever these return) lives in memory only - this app never
 *   configures query persistence to storage.
 * - Submissions with a file always go through FormData (multipart),
 *   matching the Django form's request.FILES handling exactly.
 */

export async function fetchBuyerKYC() {
  const { data } = await apiClient.get("kyc/buyer/");
  return data.data; // null if never submitted
}

export async function submitBuyerKYC(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("kyc/buyer/", payload);
  return data.data;
}

export async function fetchSellerKYC() {
  const { data } = await apiClient.get("kyc/seller/");
  return data.data;
}

export async function submitSellerKYC(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("kyc/seller/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function fetchAffiliateKYC() {
  const { data } = await apiClient.get("kyc/affiliate/");
  return data.data;
}

export async function submitAffiliateKYC(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("kyc/affiliate/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function fetchRiderKYC() {
  const { data } = await apiClient.get("kyc/rider/");
  return data.data;
}

export async function submitRiderKYC(formData) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("kyc/rider/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
