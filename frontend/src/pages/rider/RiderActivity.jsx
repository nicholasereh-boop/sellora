import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRiderActivity } from "../../api/riders";

const STATUSES = [
  ["", "All"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["cancelled", "Cancelled"],
];

export default function RiderActivity() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["rider-activity", statusFilter],
    queryFn: () => fetchRiderActivity({ status: statusFilter || undefined }),
  });

  if (isLoading) return <p className="text-mist-soft">Loading activity...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Activity</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="dash-input w-40"
        >
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {!data.results.length && (
        <div className="dash-card p-10 text-center text-mist-soft">Nothing here yet.</div>
      )}

      <div className="dash-card divide-y divide-surface-line">
        {data.results.map((task) => (
          <div key={task.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium">{task.customer_name}</p>
              <p className="text-sm text-mist-soft">
                Order {task.order_reference} &middot; {new Date(task.created_at).toLocaleDateString()}
              </p>
              {task.failure_reason && (
                <p className="text-sm text-rust mt-1">{task.failure_reason}</p>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-line text-mist-soft">
              {task.status_label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
