import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAdminOrders, recoverAdminOrder } from "../../api/admin";

// These are the *legacy* orders (apps.models.Order), the older
// single-purchase model the original custom admin listed - not the
// multi-item orders every other part of the app uses (those show up in
// the dashboard's "Recent orders"). Kept separate on purpose, matching
// the Django side's own comments about not conflating the two.
export default function AdminOrders() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchAdminOrders,
  });

  const recoverMutation = useMutation({
    mutationFn: recoverAdminOrder,
    onSuccess: () => {
      toast.success("Order recovered.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not recover order."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading orders...</p>;
  if (isError) return <p className="text-rust">Could not load orders.</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Legacy orders</h1>
      <p className="text-sm text-mist-soft mb-8">
        Single-purchase orders from the original checkout. Current cart orders appear on the dashboard.
      </p>

      {!orders.length && <div className="dash-card p-10 text-center text-mist-soft">No legacy orders.</div>}

      <div className="dash-card divide-y divide-surface-line">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium truncate">{o.reference}</p>
              <p className="text-sm text-mist-soft truncate">{o.full_name} &middot; {o.email}</p>
              <p className="text-xs text-mist-soft">{new Date(o.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-medium">{o.amount_display}</p>
              <p
                className={`text-xs ${o.purchase_status === "Recovery Needed" ? "text-marigold" : "text-mist-soft"}`}
              >
                {o.purchase_status}
              </p>
            </div>
            {o.purchase_status === "Recovery Needed" && (
              <button
                disabled={recoverMutation.isPending}
                onClick={() => recoverMutation.mutate(o.id)}
                className="dash-btn-primary text-xs px-3 py-1.5"
              >
                Recover
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
