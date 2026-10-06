import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRiderDashboard, toggleRiderAvailability } from "../../api/riders";

export default function RiderDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["rider-dashboard"],
    queryFn: fetchRiderDashboard,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleRiderAvailability,
    onSuccess: (result) => {
      toast.success(result.is_available ? "You're now available for deliveries." : "You're now offline.");
      queryClient.invalidateQueries({ queryKey: ["rider-dashboard"] });
    },
  });

  if (isLoading) return <p className="text-mist-soft">Loading dashboard...</p>;
  const { profile } = data;

  const statCards = [
    ["Today's earnings", `\u20a6${data.todays_earnings}`, "text-marigold"],
    ["Available balance", `\u20a6${data.available_balance}`, "text-moss"],
    ["Pending earnings", `\u20a6${data.pending_earnings}`, "text-mist"],
  ];

  const secondaryCards = [
    ["Delivered today", data.completed_today],
    ["Total delivered", data.total_completed],
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm text-mist-soft">Welcome back</p>
          <h1 className="font-display text-3xl">{profile.full_name}</h1>
        </div>
        <button
          disabled={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate()}
          className={`text-sm px-4 py-2 rounded-full font-medium transition-colors ${
            profile.is_available ? "bg-moss/20 text-moss" : "bg-surface-line text-mist-soft"
          }`}
        >
          {profile.is_available ? "Available" : "Offline"} &middot; toggle
        </button>
      </div>

      {data.has_active_task && (
        <Link
          to="/rider/active-delivery"
          className="block dash-card p-5 mb-6 border-indigo hover:bg-surface transition-colors"
        >
          <p className="text-sm text-marigold font-medium">You have an active {data.active_task_type}</p>
          <p className="text-sm text-mist-soft mt-1">Tap to view details &rarr;</p>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map(([label, value, accent]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className={`font-display text-2xl ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
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
