import { useQuery } from "@tanstack/react-query";
import { fetchAdminMessages } from "../../api/admin";

// Read-only, matching the original messages page.
export default function AdminMessages() {
  const { data: messages, isLoading, isError } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: fetchAdminMessages,
  });

  if (isLoading) return <p className="text-mist-soft">Loading messages...</p>;
  if (isError) return <p className="text-rust">Could not load messages.</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Messages</h1>

      {!messages.length && <div className="dash-card p-10 text-center text-mist-soft">No messages yet.</div>}

      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="dash-card p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0">
                <p className="font-medium">{m.subject || "(no subject)"}</p>
                <p className="text-sm text-mist-soft">
                  {m.name} &middot; <a href={`mailto:${m.email}`} className="hover:text-mist underline">{m.email}</a>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-mist-soft">{new Date(m.created_at).toLocaleString()}</p>
                {!m.is_read && <span className="text-xs text-marigold">Unread</span>}
              </div>
            </div>
            <p className="text-sm text-mist whitespace-pre-line">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
