import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAffiliateConversions } from "../../api/affiliates";

export default function AffiliateConversions() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-conversions", statusFilter],
    queryFn: () => fetchAffiliateConversions({ status: statusFilter || undefined }),
  });

  if (isLoading) return <p className="text-mist-soft">Loading conversions...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Conversions</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="dash-input w-48"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {!data.results.length && (
        <div className="dash-card p-10 text-center text-mist-soft">No conversions yet.</div>
      )}

      <div className="dash-card divide-y divide-surface-line">
        {data.results.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium">{c.product_name}</p>
              <p className="text-sm text-mist-soft">
                Order {c.order_reference} &middot; {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-moss font-medium">&#8358;{c.commission_amount}</p>
              <p className="text-xs text-mist-soft">{c.status_label} &middot; {c.commission_rate}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
