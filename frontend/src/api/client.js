import axios from "axios";

/**
 * Roadmap Phase 4 (CSRF and security).
 *
 * Django's session cookie is the authority on "who is logged in" and its
 * CSRF cookie is required on every unsafe request. This client:
 *  - always sends cookies (withCredentials)
 *  - reads the csrftoken cookie and echoes it back as X-CSRFToken
 *  - normalizes the {success, data} / {success, error} response shape
 *    used by the accounts/catalog/cart API views
 *  - never stores anything auth-related in localStorage - the session
 *    cookie is HttpOnly and is the only source of truth
 */

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

export const apiClient = axios.create({
  baseURL: "/api/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const csrfToken = getCookie("csrftoken");
  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
  return config;
});

// Ensures the csrftoken cookie exists before the first unsafe request -
// there's no Django-rendered <form> anywhere in the SPA to plant it, so
// GET /api/csrf/ does that job instead (see apps/api/views.py).
let csrfReady = null;
export function ensureCsrfCookie() {
  if (!csrfReady) {
    csrfReady = apiClient.get("csrf/").catch(() => {
      csrfReady = null;
    });
  }
  return csrfReady;
}

/**
 * Normalizes an axios error into the API's own {success:false, error}
 * shape so callers (forms, React Query) always deal with one shape,
 * whether Django ever responded or not.
 */
export function normalizeApiError(error) {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.status === 401) {
    return { code: "UNAUTHENTICATED", message: "Please log in to continue." };
  }
  if (error.response?.status === 403) {
    return { code: "FORBIDDEN", message: "You don't have access to do that." };
  }
  if (error.response?.status === 404) {
    return { code: "NOT_FOUND", message: "That could not be found." };
  }
  return {
    code: "NETWORK_ERROR",
    message: "Could not reach the server. Check your connection and try again.",
  };
}

export default apiClient;
