import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchRiderApplication() {
  const { data } = await apiClient.get("riders/application/");
  return data.data; // null if never applied
}

export async function submitRiderApplication(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("riders/application/", payload);
  return data.data;
}

export async function fetchRiderDashboard() {
  const { data } = await apiClient.get("riders/dashboard/");
  return data.data;
}

export async function toggleRiderAvailability() {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("riders/availability/");
  return data.data;
}

export async function fetchActiveDelivery() {
  const { data } = await apiClient.get("riders/active-delivery/");
  return data.data; // null if no active task
}

export async function fetchRiderActivity({ status, page = 1 } = {}) {
  const { data } = await apiClient.get("riders/activity/", { params: { status, page } });
  return data.data;
}

export async function fetchRiderProfile() {
  const { data } = await apiClient.get("riders/profile/");
  return data.data;
}

export async function updateRiderProfile(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch("riders/profile/", payload);
  return data.data;
}

export async function fetchRiderEarnings({ status, page = 1 } = {}) {
  const { data } = await apiClient.get("riders/earnings/", { params: { status, page } });
  return data.data;
}

export async function fetchRiderBankDetails() {
  const { data } = await apiClient.get("riders/bank-details/");
  return data.data;
}

export async function updateRiderBankDetails(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.patch("riders/bank-details/", payload);
  return data.data;
}
