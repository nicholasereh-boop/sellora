import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchDeliveryTasks, markDelivered } from "../../api/logistics";

const ACTIONABLE = ["assigned", "en_route"];

export default function RiderDeliveryTasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["logistics-delivery-tasks"],
    queryFn: fetchDeliveryTasks,
  });

  const mutation = useMutation({
    mutationFn: markDelivered,
    onSuccess: () => {
      toast.success("Delivery marked complete.");
      queryClient.invalidateQueries({ queryKey: ["logistics-delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["rider-active-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["rider-dashboard"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not mark delivered."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading deliveries...</p>;

  if (!tasks.length) {
    return <div className="dash-card p-10 text-center text-mist-soft">No delivery tasks yet.</div>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Deliveries</h1>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="dash-card p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">{task.customer_name}</p>
                <p className="text-sm text-mist-soft">
                  Order {task.order_reference} &middot; {task.customer_phone}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-line text-mist-soft">
                {task.status_label}
              </span>
            </div>
            {task.failure_reason && (
              <p className="text-sm text-rust mb-3">{task.failure_reason}</p>
            )}
            {ACTIONABLE.includes(task.status) && (
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(task.id)}
                className="dash-btn-primary text-sm px-4 py-1.5"
              >
                Mark delivered
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
