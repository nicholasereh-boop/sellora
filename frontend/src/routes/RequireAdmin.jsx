import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminMe } from "../api/admin";

// Roadmap Phase 17: route guards are UX, Django is the authority. This
// asks Django whether the *current session* is staff; every /api/admin/*
// endpoint re-checks that itself regardless of what this component does.
export default function RequireAdmin({ children }) {
  const { data: admin, isLoading } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    retry: false,
  });

  if (isLoading) return null;
  if (!admin) return <Navigate to="/admin-panel/login" replace />;
  return children;
}
