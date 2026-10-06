import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAffiliateApplication } from "../../api/affiliates";

export default function AffiliateStatusPage() {
  const navigate = useNavigate();
  const { data: application, isLoading } = useQuery({
    queryKey: ["affiliate-application"],
    queryFn: fetchAffiliateApplication,
  });

  if (isLoading) return null;
  if (!application) return <Navigate to="/affiliate/apply" replace />;
  if (application.status === "active") {
    navigate("/affiliate/dashboard", { replace: true });
    return null;
  }

  return (
    <div className="max-w-sm mx-auto text-center py-16">
      <h1 className="font-display text-2xl mb-3">Application {application.status_label}</h1>
      <p className="text-ink-soft">
        {application.status === "rejected"
          ? application.rejection_reason || "Your application wasn't approved."
          : "We'll email you once your application has been reviewed."}
      </p>
    </div>
  );
}
