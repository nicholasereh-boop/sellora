import { useQuery } from "@tanstack/react-query";
import { fetchAdminAnalytics } from "../../api/admin";
import TrendChart from "../../components/charts/TrendChart";

const money = (v) => `\u20a6${Number(v ?? 0).toLocaleString()}`;

export default function AdminAnalytics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAdminAnalytics,
  });

  if (isLoading) return <p className="text-mist-soft">Loading analytics...</p>;
  if (isError) return <p className="text-rust">Could not load analytics.</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Analytics</h1>
      <p className="text-sm text-mist-soft mb-8">Last 30 days.</p>

      <div className="dash-card p-6 mb-6">
        <p className="text-sm text-mist-soft mb-4">Revenue by day</p>
        <TrendChart {...data.revenue_by_day} color="#E4A427" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Orders by day</p>
          <TrendChart {...data.orders_by_day} color="#3D3287" />
        </div>
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Refunds by day</p>
          <TrendChart {...data.refunds_by_day} color="#C0472E" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Where the money goes</p>
          <div className="divide-y divide-surface-line">
            {data.revenue_distribution.labels.map((label, i) => (
              <div key={label} className="flex justify-between py-2.5 text-sm">
                <span>{label}</span>
                <span className="text-mist-soft">{money(data.revenue_distribution.values[i])}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card p-6">
          <p className="text-sm text-mist-soft mb-4">Top sellers by earnings</p>
          {!data.top_sellers.labels.length && <p className="text-sm text-mist-soft">No sales yet.</p>}
          <div className="divide-y divide-surface-line">
            {data.top_sellers.labels.map((label, i) => (
              <div key={label} className="flex justify-between py-2.5 text-sm">
                <span>{label}</span>
                <span className="text-mist-soft">{money(data.top_sellers.values[i])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-card p-6">
        <p className="text-sm text-mist-soft mb-4">Top affiliates</p>
        {!data.top_affiliates.length && <p className="text-sm text-mist-soft">No affiliate activity yet.</p>}
        <div className="divide-y divide-surface-line">
          {data.top_affiliates.map((a) => (
            <div key={a.name} className="flex justify-between py-2.5 text-sm">
              <span>{a.name}</span>
              <span className="text-mist-soft">
                {a.clicks} clicks &middot; {a.conversions} sales &middot; {money(a.earnings)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
