import { useQuery } from "@tanstack/react-query";
import { fetchAdminUsers } from "../../api/admin";

function Badge({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-surface-line text-mist-soft",
    good: "bg-moss/20 text-moss",
    gold: "bg-marigold/20 text-marigold",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

// Read-only, matching the original users page (no edit/delete there).
export default function AdminUsers() {
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  if (isLoading) return <p className="text-mist-soft">Loading users...</p>;
  if (isError) return <p className="text-rust">Could not load users.</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Users</h1>
      <p className="text-sm text-mist-soft mb-8">{users.length} accounts</p>

      <div className="dash-card divide-y divide-surface-line">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="font-medium truncate">{u.username}</p>
              <p className="text-sm text-mist-soft truncate">{u.email || "no email"}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {u.is_superuser && <Badge tone="gold">Superuser</Badge>}
              {u.is_staff && !u.is_superuser && <Badge tone="gold">Staff</Badge>}
              <Badge tone={u.is_active ? "good" : "muted"}>{u.is_active ? "Active" : "Inactive"}</Badge>
              <span className="text-xs text-mist-soft hidden md:inline">
                {new Date(u.date_joined).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
