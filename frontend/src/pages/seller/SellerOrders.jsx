import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchSellerOrders, updateFulfillmentStatus } from "../../api/sellers";

export default function SellerOrders() {
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-orders", statusFilter],
    queryFn: () => fetchSellerOrders({ status: statusFilter || undefined }),
  });

  const mutation = useMutation({
    mutationFn: ({ itemId, fulfillmentStatus }) => updateFulfillmentStatus(itemId, fulfillmentStatus),
    onSuccess: () => {
      toast.success("Fulfillment status updated.");
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not update."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading orders...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="dash-input w-48"
        >
          <option value="">All statuses</option>
          {data.status_choices.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {!data.results.length && (
        <div className="dash-card p-10 text-center text-mist-soft">No orders yet.</div>
      )}

      <div className="dash-card divide-y divide-surface-line">
        {data.results.map((row) => (
          <div key={row.item_id} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{row.product_name}</p>
                <p className="text-sm text-mist-soft">
                  Order {row.order_reference} &middot; {row.quantity} &times; &#8358;{row.unit_price}
                </p>
                <p className="text-sm text-mist-soft">
                  {row.customer_name}{row.customer_area ? ` \u00b7 ${row.customer_area}` : ""}
                  {row.customer_phone ? ` \u00b7 ${row.customer_phone}` : ""}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-line text-mist-soft">
                {row.status_label}
              </span>
            </div>

            {row.is_paid && (
              <div className="mt-3">
                <select
                  defaultValue={row.fulfillment_status}
                  onChange={(e) =>
                    mutation.mutate({ itemId: row.item_id, fulfillmentStatus: e.target.value })
                  }
                  className="dash-input w-56"
                >
                  {data.fulfillment_status_choices.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
