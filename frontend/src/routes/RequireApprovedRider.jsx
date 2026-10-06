import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRiderApplication } from "../api/riders";
import { useAuth } from "../contexts/AuthContext";

export default function RequireApprovedRider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: application, isLoading } = useQuery({
    queryKey: ["rider-application"],
    queryFn: fetchRiderApplication,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!application) return <Navigate to="/rider/apply" replace />;
  if (application.status !== "approved") return <Navigate to="/rider/status" replace />;

  return children;
}
