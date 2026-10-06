import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { markDelivered, markPickupCollected, reportPickupException } from "../../api/logistics";
import { fetchActiveDelivery } from "../../api/riders";

export default function RiderActiveDelivery() {
  const queryClient = useQueryClient();
  const [reportingException, setReportingException] = useState(false);
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rider-active-delivery"],
    queryFn: fetchActiveDelivery,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["rider-active-delivery"] });
    queryClient.invalidateQueries({ queryKey: ["logistics-pickup-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["logistics-delivery-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["rider-dashboard"] });
  }

  const collectMutation = useMutation({
    mutationFn: markPickupCollected,
    onSuccess: () => {
      toast.success("Package marked collected.");
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not mark collected."),
  });

  const exceptionMutation = useMutation({
    mutationFn: ({ taskId, missing, reason }) => reportPickupException(taskId, { missing, reason }),
    onSuccess: () => {
      toast.success("Issue reported.");
      setReportingException(false);
      invalidate();
    },
  });

  const deliverMutation = useMutation({
    mutationFn: markDelivered,
    onSuccess: () => {
      toast.success("Delivery marked complete.");
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not mark delivered."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading...</p>;

  if (!data) {
    return (
      <div className="dash-card p-10 text-center text-mist-soft">
        You don't have an active pickup or delivery right now.
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl mb-2">Order {data.reference}</h1>
      <p className="text-sm text-mist-soft mb-8 capitalize">{data.leg_type} in progress</p>

      <div className="flex items-center mb-8">
        {data.steps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= data.step_index ? "bg-marigold text-canvas" : "bg-surface-line text-mist-soft"
                }`}
              >
                {i + 1}
              </div>
              <p className="text-xs text-mist-soft mt-1.5 text-center w-16">{step}</p>
            </div>
            {i < data.steps.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${i < data.step_index ? "bg-marigold" : "bg-surface-line"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="dash-card p-5 mb-6">
        <p className="text-xs text-mist-soft mb-1">{data.contact.label}</p>
        <p className="font-medium">{data.contact.name}</p>
        <p className="text-sm text-mist-soft">{data.contact.phone}</p>
      </div>

      {data.leg_type === "pickup" && !reportingException && (
        <div className="flex gap-3">
          <button
            disabled={collectMutation.isPending}
            onClick={() => collectMutation.mutate(data.task.id)}
            className="dash-btn-primary"
          >
            Mark collected
          </button>
          <button onClick={() => setReportingException(true)} className="text-sm text-rust">
            Report issue
          </button>
        </div>
      )}

      {data.leg_type === "pickup" && reportingException && (
        <div className="border border-surface-line rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-mist-soft">
            <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} />
            Package is missing
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue"
            rows={3}
            className="dash-input"
          />
          <div className="flex gap-3">
            <button
              disabled={exceptionMutation.isPending || !reason}
              onClick={() => exceptionMutation.mutate({ taskId: data.task.id, missing, reason })}
              className="bg-rust text-canvas text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              Submit
            </button>
            <button onClick={() => setReportingException(false)} className="dash-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {data.leg_type === "delivery" && (
        <button
          disabled={deliverMutation.isPending}
          onClick={() => deliverMutation.mutate(data.task.id)}
          className="dash-btn-primary"
        >
          Mark delivered
        </button>
      )}
    </div>
  );
}
