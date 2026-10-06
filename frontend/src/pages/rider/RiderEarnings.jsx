import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRiderEarnings } from "../../api/riders";

export default function RiderEarnings() {
  const { data, isLoading } = useQuery({
    queryKey: ["rider-earnings"],
    queryFn: () => fetchRiderEarnings(),
  });

  if (isLoading) return <p className="text-mist-soft">Loading earnings...</p>;

  const statCards = [
    ["Available balance", `\u20a6${data.available_balance}`, "text-moss"],
    ["Pending", `\u20a6${data.pending_earnings}`, "text-mist"],
    ["Paid out", `\u20a6${data.paid_earnings}`, "text-mist-soft"],
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Earnings</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(([label, value, accent]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className={`font-display text-2xl ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {!data.can_withdraw && (
        <div className="dash-card p-5 mb-8 text-sm">
          <p className="font-medium mb-1">Verify your account to be paid out</p>
          <p className="text-mist-soft mb-3">
            Earnings are only paid out once your identity verification has been confirmed. Current status:{" "}
            {data.kyc_status_label}.
          </p>
          <Link to="/kyc/rider" className="text-marigold hover:underline">
            Go to verification &rarr;
          </Link>
        </div>
      )}

      {!data.results.length && <p className="text-mist-soft text-sm">No earnings yet.</p>}
      <div className="dash-card divide-y divide-surface-line">
        {data.results.map((e) => (
          <div key={e.id} className="flex justify-between px-5 py-3 text-sm">
            <span>Order {e.order_reference} &middot; {e.leg}</span>
            <span className="text-moss">&#8358;{e.amount}</span>
            <span className="text-mist-soft">{e.status_label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
