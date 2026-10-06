import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { useAuth } from "../contexts/AuthContext";

// Deliberately polling, not websockets - matches the Django app's own
// "incremental refresh" design (apps/notifications/views.py docstring:
// real-time is explicitly out of scope for this stage).
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
  return data ?? 0;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: fetchNotifications,
  });

  function invalidateCount() {
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  }

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      invalidateCount();
    },
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      invalidateCount();
    },
  });

  return {
    notifications: listQuery.data,
    isLoading: listQuery.isLoading,
    markRead: (id) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}
