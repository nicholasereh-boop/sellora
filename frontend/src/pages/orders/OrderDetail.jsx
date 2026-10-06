import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrder, requestRefund } from "../../api/orders";
import { normalizeApiError } from "../../api/client";

const REASON_CATEGORIES = [
  ["not_as_described", "Not as described"],
  ["damaged", "Damaged / defective"],
  ["wrong_item", "Wrong item"],
  ["no_longer_needed", "No longer needed"],
  ["other", "Other"],
];

export default function OrderDetail() {
  const { reference } = useParams();
  const queryClient = useQueryClient();
  const [refundItemId, setRefundItemId] = useState(null);
  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", reference],
    queryFn: () => fetchOrder(reference),
    // Poll while unpaid so the page reflects a Paystack callback that
    // lands shortly after redirect back from checkout.
    refetchInterval: (query) => (query.state.data?.is_paid ? false : 5000),
  });

  const refundMutation = useMutation({
    mutationFn: ({ itemId }) => requestRefund(reference, itemId, { reasonCategory, reason }),
    onSuccess: () => {
      toast.success("Refund request submitted.");
      setRefundItemId(null);
      setReason("");
      setReasonCategory("");
      queryClient.invalidateQueries({ queryKey: ["order", reference] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  if (isLoading) return <p className="text-ink-soft">Loading order...</p>;
  if (!order) return <p className="text-rust">Order not found.</p>;

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink transition-colors";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Order {order.reference}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-ink/5 text-ink-soft">
          {order.status_label}
        </span>
      </div>

      <div className="divide-y divide-paper-line border-t border-b border-paper-line mb-8">
        {order.items.map((item) => {
          const existingRefund = order.refunds.find((r) => r.order_item_id === item.id);
          return (
            <div key={item.id} className="py-5">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-ink-soft">
                    {item.seller_name} &middot; {item.quantity} &times; &#8358;{item.unit_price}
                  </p>
                </div>
                <p className="font-display text-lg">&#8358;{item.subtotal}</p>
              </div>

              {order.is_paid && (
                <div className="mt-3 flex gap-4 text-sm">
                  {existingRefund ? (
                    <span className="text-ink-soft">
                      Refund: {existingRefund.status_label}
                    </span>
                  ) : (
                    <button
                      onClick={() => setRefundItemId(item.id)}
                      className="text-rust hover:underline"
                    >
                      Request refund
                    </button>
                  )}
                </div>
              )}

              {refundItemId === item.id && (
                <div className="mt-4 border border-paper-line rounded-lg p-4 space-y-3">
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a reason...</option>
                    {REASON_CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the issue"
                    className={inputClass}
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <button
                      disabled={refundMutation.isPending}
                      onClick={() => refundMutation.mutate({ itemId: item.id })}
                      className="bg-ink text-paper text-sm px-4 py-1.5 rounded-full disabled:opacity-50"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setRefundItemId(null)}
                      className="text-sm text-ink-soft"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-sm text-ink-soft space-y-1.5 max-w-xs ml-auto">
        <div className="flex justify-between"><span>Subtotal</span><span>&#8358;{order.subtotal}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>&#8358;{order.shipping_fee}</span></div>
        <div className="flex justify-between font-display text-lg text-ink pt-1">
          <span>Total</span><span>&#8358;{order.total}</span>
        </div>
      </div>

      {order.shipping_address && (
        <div className="mt-10 text-sm text-ink-soft">
          <p className="font-medium text-ink mb-1">Shipping address</p>
          <p>{order.shipping_address.address_line1}</p>
          {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
          <p>
            {order.shipping_address.city}, {order.shipping_address.state}{" "}
            {order.shipping_address.postal_code}
          </p>
          <p>{order.shipping_address.country}</p>
        </div>
      )}
    </div>
  );
}
