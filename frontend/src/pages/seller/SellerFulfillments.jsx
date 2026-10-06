import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchFulfillments, markFulfillmentReady } from "../../api/logistics";

export default function SellerFulfillments() {
  const queryClient = useQueryClient();
  const { data: fulfillments, isLoading } = useQuery({
    queryKey: ["seller-fulfillments"],
    queryFn: fetchFulfillments,
  });

  const mutation = useMutation({
    mutationFn: markFulfillmentReady,
    onSuccess: () => {
      toast.success("Marked ready for pickup.");
      queryClient.invalidateQueries({ queryKey: ["seller-fulfillments"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not mark ready."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading fulfillments...</p>;

  if (!fulfillments.length) {
    return <div className="dash-card p-10 text-center text-mist-soft">No fulfillments yet.</div>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Fulfillment</h1>

      <div className="dash-card divide-y divide-surface-line">
        {fulfillments.map((f) => (
          <div key={f.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium">Order {f.order_reference}</p>
              <p className="text-sm text-mist-soft">
                {f.package_reference && `Package ${f.package_reference} \u00b7 `}
                {new Date(f.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-line text-mist-soft">
                {f.status_label}
              </span>
              {f.status === "pending" && (
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(f.id)}
                  className="dash-btn-primary text-sm px-4 py-1.5"
                >
                  Mark ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
