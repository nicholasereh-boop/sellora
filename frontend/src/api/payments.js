import apiClient, { ensureCsrfCookie } from "./client";

// Only initiation. Paystack itself hosts the actual card-entry page, and
// the webhook is a server-to-server Django endpoint React never calls
// (roadmap Phase 8) - PAYSTACK_SECRET_KEY never reaches the browser.
export async function initiatePayment(orderReference) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`payments/initiate/${orderReference}/`);
  return data.data; // { authorization_url, already_paid }
}
