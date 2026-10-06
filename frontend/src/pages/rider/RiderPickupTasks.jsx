import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptPickupTask,
  fetchPickupTasks,
  markPickupCollected,
  reportPickupException,
} from "../../api/logistics";

function TaskCard({ task, action }) {
  return (
    <div className="dash-card p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium">{task.seller_name}</p>
          <p className="text-sm text-mist-soft">Order {task.order_reference}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-surface-line text-mist-soft">
          {task.status_label}
        </span>
      </div>
      <p className="text-sm text-mist-soft mb-1">{task.pickup_address}</p>
      <p className="text-sm text-mist-soft mb-4">{task.seller_phone}</p>
      {action}
    </div>
  );
}

export default function RiderPickupTasks() {
  const queryClient = useQueryClient();
  const [exceptionTaskId, setExceptionTaskId] = useState(null);
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["logistics-pickup-tasks"],
    queryFn: fetchPickupTasks,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["logistics-pickup-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["rider-active-delivery"] });
  }

  const acceptMutation = useMutation({
    mutationFn: acceptPickupTask,
    onSuccess: () => {
      toast.success("Task accepted.");
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not accept task."),
  });

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
      setExceptionTaskId(null);
      setReason("");
      setMissing(false);
      invalidate();
    },
  });

  if (isLoading) return <p className="text-mist-soft">Loading tasks...</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Pickup tasks</h1>

      {data.my_tasks.length > 0 && (
        <>
          <p className="text-sm text-mist-soft mb-3">My tasks</p>
          <div className="space-y-4 mb-10">
            {data.my_tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                action={
                  exceptionTaskId === task.id ? (
                    <div className="border border-surface-line rounded-lg p-4 space-y-3">
                      <label className="flex items-center gap-2 text-sm text-mist-soft">
                        <input
                          type="checkbox"
                          checked={missing}
                          onChange={(e) => setMissing(e.target.checked)}
                        />
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
                          onClick={() => exceptionMutation.mutate({ taskId: task.id, missing, reason })}
                          className="bg-rust text-canvas text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button onClick={() => setExceptionTaskId(null)} className="dash-btn-ghost">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        disabled={collectMutation.isPending}
                        onClick={() => collectMutation.mutate(task.id)}
                        className="dash-btn-primary text-sm px-4 py-1.5"
                      >
                        Mark collected
                      </button>
                      <button
                        onClick={() => setExceptionTaskId(task.id)}
                        className="text-sm text-rust"
                      >
                        Report issue
                      </button>
                    </div>
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      <p className="text-sm text-mist-soft mb-3">Available tasks</p>
      {!data.available_tasks.length && (
        <p className="text-mist-soft text-sm">No tasks available right now.</p>
      )}
      <div className="space-y-4">
        {data.available_tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            action={
              <button
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(task.id)}
                className="dash-btn-primary text-sm px-4 py-1.5"
              >
                Accept task
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
