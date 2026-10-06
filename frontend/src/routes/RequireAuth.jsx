import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Roadmap Phase 17: "React route guards are UX protection, not security."
// Every API endpoint behind this still enforces IsAuthenticated/object-level
// permissions on the Django side regardless of what this component does.
export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
