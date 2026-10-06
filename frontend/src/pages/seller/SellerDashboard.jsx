import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../api/sellers";
import TrendChart from "../../components/charts/TrendChart";

const PERIODS = [
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
];

export default function SellerDashboard() {
  const [period, setPeriod] = useState("daily");
  const { data, isLoading } = useQuery({
    queryKey: ["seller-dashboard", period],
    queryFn: () => fetchDashboard(period),
  });

  if (isLoading) return <p className="text-mist-soft">Loading dashboard...</p>;
  const { stats } = data;

  const statCards = [
    ["Total sales", `\u20a6${stats.total_sales}`, "text-marigold"],
    ["Available balance", `\u20a6${stats.available_balance}`, "text-moss"],
    ["Pending payout", `\u20a6${stats.pending_payout}`, "text-mist"],
    ["Paid out", `\u20a6${stats.paid_out}`, "text-mist-soft"],
  ];

  const secondaryCards = [
    ["Products", stats.total_products],
    ["Orders", stats.total_orders],
    ["Items sold", stats.total_items_sold],
    ["Awaiting fulfillment", stats.pending_fulfillment_count],
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm text-mist-soft">Welcome back</p>
          <h1 className="font-display text-3xl">Store dashboard</h1>
        </div>
        <div className="flex gap-1 bg-surface border border-surface-line rounded-lg p-1">
          {PERIODS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                period === value ? "bg-indigo text-white" : "text-mist-soft hover:text-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(([label, value, accent]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className={`font-display text-2xl ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="dash-card p-6 mb-6">
        <p className="text-sm text-mist-soft mb-4">Revenue - {period}</p>
        <TrendChart {...data.revenue_trend} color="#E4A427" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {secondaryCards.map(([label, value]) => (
          <div key={label} className="border border-surface-line rounded-lg p-4">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {data.product_performance?.top?.length > 0 && (
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Top products</p>
          <div className="divide-y divide-surface-line">
            {data.product_performance.top.map((p) => (
              <div key={p.name} className="flex justify-between py-2.5 text-sm">
                <span>{p.name}</span>
                <span className="text-mist-soft">{p.units} sold &middot; \u20a6{p.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
