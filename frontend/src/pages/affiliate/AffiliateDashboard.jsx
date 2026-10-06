import { useQuery } from "@tanstack/react-query";
import { fetchAffiliateDashboard } from "../../api/affiliates";

export default function AffiliateDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: fetchAffiliateDashboard,
  });

  if (isLoading) return <p className="text-mist-soft">Loading dashboard...</p>;

  const statCards = [
    ["Total earnings", `\u20a6${data.total_earnings}`, "text-marigold"],
    ["Available balance", `\u20a6${data.available_balance}`, "text-moss"],
    ["Pending earnings", `\u20a6${data.pending_earnings}`, "text-mist"],
  ];

  const secondaryCards = [
    ["Active links", data.total_links],
    ["Total clicks", data.total_clicks],
    ["Conversions", data.total_conversions],
    ["Conversion rate", `${Number(data.conversion_rate).toFixed(1)}%`],
  ];

  return (
    <div>
      <p className="text-sm text-mist-soft">Welcome back</p>
      <h1 className="font-display text-3xl mb-8">Affiliate dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map(([label, value, accent]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className={`font-display text-2xl ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryCards.map(([label, value]) => (
          <div key={label} className="border border-surface-line rounded-lg p-4">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
