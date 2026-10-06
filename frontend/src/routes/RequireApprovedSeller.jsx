import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApplication } from "../api/sellers";
import { useAuth } from "../contexts/AuthContext";

export default function RequireApprovedSeller({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: application, isLoading } = useQuery({
    queryKey: ["seller-application"],
    queryFn: fetchApplication,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!application) return <Navigate to="/sell/apply" replace />;
  if (application.status !== "approved") return <Navigate to="/sell/status" replace />;

  return children;
}
