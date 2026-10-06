import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAffiliateApplication } from "../api/affiliates";
import { useAuth } from "../contexts/AuthContext";

export default function RequireActiveAffiliate({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: application, isLoading } = useQuery({
    queryKey: ["affiliate-application"],
    queryFn: fetchAffiliateApplication,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!application) return <Navigate to="/affiliate/apply" replace />;
  if (application.status !== "active") return <Navigate to="/affiliate/status" replace />;

  return children;
}
