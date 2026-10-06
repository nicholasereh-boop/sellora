import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAffiliateAnalytics } from "../../api/affiliates";
import TrendChart from "../../components/charts/TrendChart";

const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];

export default function AffiliateAnalytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-analytics", days],
    queryFn: () => fetchAffiliateAnalytics(days),
  });

  if (isLoading) return <p className="text-mist-soft">Loading analytics...</p>;

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-display text-3xl">Analytics</h1>
        <div className="flex gap-1 bg-surface border border-surface-line rounded-lg p-1">
          {RANGES.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                days === value ? "bg-indigo text-white" : "text-mist-soft hover:text-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Clicks</p>
          <TrendChart {...data.clicks_by_day} color="#3D3287" />
        </div>
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Conversions</p>
          <TrendChart {...data.conversions_by_day} color="#3E8A5B" />
        </div>
      </div>

      {data.top_products?.labels?.length > 0 && (
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Top products by earnings</p>
          <div className="divide-y divide-surface-line">
            {data.top_products.labels.map((label, i) => (
              <div key={label} className="flex justify-between py-2.5 text-sm">
                <span>{label}</span>
                <span className="text-mist-soft">&#8358;{data.top_products.values[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
