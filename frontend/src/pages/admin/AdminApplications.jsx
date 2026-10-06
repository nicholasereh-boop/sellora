import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { approveApplication, fetchPendingApplications, rejectApplication } from "../../api/admin";

const ROLE_META = {
  sellers: {
    title: "Seller applications",
    name: (a) => a.store_name,
    fields: (a) => [
      ["Applicant", `${a.username}`],
      ["Business email", a.business_email],
      ["Phone", a.phone],
      ...(a.store_description ? [["Description", a.store_description]] : []),
    ],
  },
  affiliates: {
    title: "Affiliate applications",
    name: (a) => a.full_name,
    fields: (a) => [
      ["Applicant", a.username],
      ["Contact email", a.contact_email],
      ["Phone", a.phone],
      ["Promotional channels", a.promotional_channels],
    ],
  },
  riders: {
    title: "Rider applications",
    name: (a) => a.full_name,
    fields: (a) => [
      ["Applicant", a.username],
      ["Phone", a.phone],
      ["Service area", a.service_area],
      ["Vehicle", a.vehicle_type],
    ],
  },
};

export default function AdminApplications() {
  const { role } = useParams();
  const meta = ROLE_META[role];
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ["admin-applications", role],
    queryFn: () => fetchPendingApplications(role),
    enabled: Boolean(meta),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-applications", role] });
    // The dashboard's "Needs attention" count for this role is now stale.
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  const approveMutation = useMutation({
    mutationFn: (id) => approveApplication(role, id),
    onSuccess: (data) => {
      toast.success(data.message);
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not approve."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectApplication(role, id, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      setRejectingId(null);
      setReason("");
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not reject."),
  });

  if (!meta) return <p className="text-rust">Unknown application type.</p>;
  if (isLoading) return <p className="text-mist-soft">Loading applications...</p>;
  if (isError) return <p className="text-rust">Could not load applications.</p>;

  return (
    <div>
      <Link
        to="/admin-panel/dashboard"
        className="text-sm text-mist-soft hover:text-mist flex items-center gap-1 mb-6 w-fit"
      >
        <ArrowLeft size={15} />
        Back to dashboard
      </Link>

      <h1 className="font-display text-3xl mb-8">{meta.title}</h1>

      {!applications.length && (
        <div className="dash-card p-10 text-center text-mist-soft">
          No pending {meta.title.toLowerCase()}.
        </div>
      )}

      <div className="space-y-4">
        {applications.map((a) => (
          <div key={a.id} className="dash-card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="font-medium">{meta.name(a)}</p>
                <p className="text-xs text-mist-soft">
                  Applied {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
              {meta.fields(a).map(([label, value]) => (
                <div key={label} className="col-span-2 sm:col-span-1 flex gap-2">
                  <dt className="text-mist-soft flex-shrink-0">{label}:</dt>
                  <dd className="truncate">{value}</dd>
                </div>
              ))}
            </dl>

            {rejectingId === a.id ? (
              <div className="border border-surface-line rounded-lg p-4 space-y-3">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  rows={2}
                  className="dash-input"
                />
                <div className="flex gap-3">
                  <button
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: a.id, reason })}
                    className="bg-rust text-canvas text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                  <button onClick={() => setRejectingId(null)} className="dash-btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(a.id)}
                  className="dash-btn-primary text-sm px-4 py-1.5"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setRejectingId(a.id);
                    setReason("");
                  }}
                  className="text-sm text-rust"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
