import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPayouts, requestPayout } from "../../api/sellers";

export default function SellerPayouts() {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["seller-payouts"], queryFn: fetchPayouts });

  const mutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: () => {
      toast.success("Payout requested.");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not request payout."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading payouts...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl mb-8">Payouts</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="dash-card p-5">
          <p className="text-xs text-mist-soft mb-1">Available balance</p>
          <p className="font-display text-2xl text-moss">&#8358;{data.available_balance}</p>
        </div>
        <div className="dash-card p-5">
          <p className="text-xs text-mist-soft mb-1">Pending earnings</p>
          <p className="font-display text-2xl">&#8358;{data.pending_earnings}</p>
        </div>
      </div>

      {!data.can_withdraw ? (
        <div className="dash-card p-5 mb-8 text-sm">
          <p className="font-medium mb-1">Verify your account to withdraw</p>
          <p className="text-mist-soft mb-3">
            Withdrawals are only available once your identity verification has been confirmed. Current status:{" "}
            {data.kyc_status_label}.
          </p>
          <Link to="/kyc/seller" className="text-marigold hover:underline">
            Go to verification &rarr;
          </Link>
        </div>
      ) : data.has_pending_request ? (
        <p className="text-sm text-mist-soft mb-8">
          You already have a payout request in progress.
        </p>
      ) : (
        <div className="flex gap-2 mb-10">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="dash-input"
          />
          <button
            disabled={mutation.isPending || !amount}
            onClick={() => mutation.mutate(amount)}
            className="dash-btn-primary whitespace-nowrap"
          >
            Request payout
          </button>
        </div>
      )}

      <p className="text-sm text-mist-soft mb-3">Payout history</p>
      {!data.payouts.length && <p className="text-mist-soft text-sm">No payouts yet.</p>}
      <div className="dash-card divide-y divide-surface-line">
        {data.payouts.map((p) => (
          <div key={p.id} className="flex justify-between px-5 py-3 text-sm">
            <span>&#8358;{p.amount}</span>
            <span className="text-mist-soft">{p.status_label}</span>
            <span className="text-mist-soft">{new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
