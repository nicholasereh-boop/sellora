import { useNotifications } from "../../hooks/useNotifications";

export default function NotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();

  if (isLoading) return <p className="text-ink-soft">Loading notifications...</p>;

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Notifications</h1>
        {notifications?.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="text-sm text-ink-soft hover:text-ink transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {!notifications?.length && (
        <p className="text-ink-soft">No notifications yet.</p>
      )}

      <div className="divide-y divide-paper-line border-t border-b border-paper-line">
        {notifications?.map((n) => {
          const content = (
            <div className={`py-4 flex items-start gap-3 ${!n.is_read ? "bg-ink/[0.03]" : ""}`}>
              {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-marigold flex-shrink-0" />}
              <div className={!n.is_read ? "" : "pl-5"}>
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-ink-soft mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );

          // Notification URLs point at Django's existing template routes
          // (e.g. seller order list) which aren't React routes yet - a
          // real page navigation, not a client-side Link, is correct
          // here until those pages are migrated too.
          return n.url ? (
            <a key={n.id} href={n.url} onClick={() => !n.is_read && markRead(n.id)}>
              {content}
            </a>
          ) : (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className="w-full text-left"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
