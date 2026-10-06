import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchPickupTasks() {
  const { data } = await apiClient.get("logistics/pickup-tasks/");
  return data.data; // { my_tasks, available_tasks }
}

export async function acceptPickupTask(taskId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`logistics/pickup-tasks/${taskId}/accept/`);
  return data.data;
}

export async function markPickupCollected(taskId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`logistics/pickup-tasks/${taskId}/collect/`);
  return data.data;
}

export async function reportPickupException(taskId, { missing, reason }) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`logistics/pickup-tasks/${taskId}/exception/`, {
    missing,
    reason,
  });
  return data.data;
}

export async function fetchDeliveryTasks() {
  const { data } = await apiClient.get("logistics/delivery-tasks/");
  return data.data;
}

export async function markDelivered(taskId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`logistics/delivery-tasks/${taskId}/deliver/`);
  return data.data;
}

export async function fetchFulfillments() {
  const { data } = await apiClient.get("logistics/fulfillments/");
  return data.data;
}

export async function markFulfillmentReady(fulfillmentId) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`logistics/fulfillments/${fulfillmentId}/ready/`);
  return data.data;
}
