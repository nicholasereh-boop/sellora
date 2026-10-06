import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboard } from "../../api/admin";

const money = (v) => `\u20a6${Number(v ?? 0).toLocaleString()}`;

export default function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
  });

  if (isLoading) return <p className="text-mist-soft">Loading dashboard...</p>;
  if (isError) return <p className="text-rust">Could not load the dashboard.</p>;

  const headline = [
    ["Gross marketplace volume", money(data.gross_marketplace_volume), "text-marigold"],
    ["Platform revenue", money(data.platform_revenue), "text-moss"],
    ["Owed to sellers", money(data.seller_liabilities), "text-mist"],
    ["Owed to affiliates", money(data.affiliate_liabilities), "text-mist"],
    ["Rider payments", money(data.rider_payments), "text-mist"],
  ];

  const counts = [
    ["Users", data.total_users],
    ["Products", data.total_products],
    ["Orders", data.total_orders],
    ["Failed purchases", data.failed_purchases],
    ["Sellers", data.total_sellers],
    ["Affiliates", data.total_affiliates],
    ["Riders", data.total_riders],
    ["Reviews", data.total_reviews],
    ["Messages", data.total_messages],
  ];

  // The three application cards get a "Review" action button (bottom
  // right) linking to AdminApplications, which calls the same
  // approve_seller/approve_affiliate/approve_rider (and reject_*)
  // service functions the Django admin's own bulk actions use. The
  // other needs-attention cards are informational only for now.
  const needsAttention = [
    ["Seller applications", data.pending_seller_applications, "sellers"],
    ["Affiliate applications", data.pending_affiliate_applications, "affiliates"],
    ["Rider applications", data.pending_rider_applications, "riders"],
    ["Seller payouts", data.pending_seller_payouts],
    ["Affiliate payouts", data.pending_affiliate_payouts],
    ["Refund requests", data.pending_refunds],
    ["Active disputes", data.active_disputes],
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Admin dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {headline.map(([label, value, accent]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className={`font-display text-2xl ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-mist-soft mb-3">Needs attention</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {needsAttention.map(([label, value, role]) => (
          <div
            key={label}
            className={`rounded-lg p-4 border flex flex-col justify-between gap-3 ${
              value > 0 ? "border-marigold/60" : "border-surface-line"
            }`}
          >
            <div>
              <p className="text-xs text-mist-soft mb-1">{label}</p>
              <p className={`text-lg font-semibold ${value > 0 ? "text-marigold" : ""}`}>{value}</p>
            </div>
            {role && (
              <Link
                to={`/admin-panel/applications/${role}`}
                className="self-end text-xs font-medium px-3 py-1.5 rounded-lg bg-marigold text-canvas hover:opacity-90 transition-opacity"
              >
                Review
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-mist-soft mb-3">Totals</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {counts.map(([label, value]) => (
          <div key={label} className="border border-surface-line rounded-lg p-4">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Recent orders</p>
          {!data.recent_orders.length && <p className="text-sm text-mist-soft">No orders yet.</p>}
          <div className="divide-y divide-surface-line">
            {data.recent_orders.map((o) => (
              <div key={o.reference} className="flex justify-between py-2.5 text-sm">
                <span>{o.reference}</span>
                <span className="text-mist-soft">{o.status_label} &middot; {money(o.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Recent messages</p>
          {!data.recent_messages.length && <p className="text-sm text-mist-soft">No messages yet.</p>}
          <div className="divide-y divide-surface-line">
            {data.recent_messages.map((m) => (
              <div key={m.id} className="py-2.5 text-sm">
                <p>{m.subject || "(no subject)"}</p>
                <p className="text-xs text-mist-soft">{m.name} &middot; {m.email}</p>
              </div>
            ))}
          </div>
          <Link to="/admin-panel/messages" className="text-sm text-marigold hover:underline mt-3 inline-block">
            All messages &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
