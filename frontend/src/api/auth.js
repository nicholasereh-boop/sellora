import apiClient, { ensureCsrfCookie } from "./client";

// Thin wrappers around apps/accounts/api/urls.py - one function per
// endpoint, no business logic duplicated on the client (roadmap Phase 3).

export async function fetchCurrentUser() {
  try {
    const { data } = await apiClient.get("auth/me/");
    return data.data;
  } catch (error) {
    // 401 just means "no one is logged in yet" - not an error state for
    // the caller (AuthProvider), which treats a null user as logged-out.
    if (error.response?.status === 401) return null;
    throw error;
  }
}

export async function login({ username, password }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/login/", { username, password });
  return data.data;
}

export async function register(payload) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/register/", payload);
  return data.data;
}

export async function logout() {
  const { data } = await apiClient.post("auth/logout/");
  return data.data;
}

export async function resendVerification(email) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/resend-verification/", { email });
  return data.data;
}

export async function requestPasswordReset(email) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/password-reset/", { email });
  return data.data;
}

// Completes the emailed verification link (opened at /verify-email/:uid/:token).
export async function verifyEmail({ uid, token }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/verify-email/", { uid, token });
  return data.data;
}

// Completes the emailed reset link (opened at /reset-password/:uid/:token).
export async function confirmPasswordReset({ uid, token, new_password1, new_password2 }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("auth/password-reset/confirm/", {
    uid, token, new_password1, new_password2,
  });
  return data.data;
}

export async function fetchProfile() {
  const { data } = await apiClient.get("auth/profile/");
  return data.data;
}

export async function updateProfile(formData) {
  const { data } = await apiClient.patch("auth/profile/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
