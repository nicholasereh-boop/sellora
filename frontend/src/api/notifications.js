import apiClient, { ensureCsrfCookie } from "./client";

export async function fetchNotifications() {
  const { data } = await apiClient.get("notifications/");
  return data.data;
}

export async function fetchUnreadCount() {
  const { data } = await apiClient.get("notifications/unread-count/");
  return data.data.unread_count;
}

export async function markNotificationRead(id) {
  await ensureCsrfCookie();
  const { data } = await apiClient.post(`notifications/${id}/read/`);
  return data.data;
}

export async function markAllNotificationsRead() {
  await ensureCsrfCookie();
  const { data } = await apiClient.post("notifications/read-all/");
  return data.data;
}
