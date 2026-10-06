import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard, BarChart3, ClipboardList, Package, Users, Mail, LogOut,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { adminLogout } from "../api/admin";

const links = [
  ["/admin-panel/dashboard", "Dashboard", LayoutDashboard],
  ["/admin-panel/analytics", "Analytics", BarChart3],
  ["/admin-panel/orders", "Legacy orders", ClipboardList],
  ["/admin-panel/products", "Products", Package],
  ["/admin-panel/users", "Users", Users],
  ["/admin-panel/messages", "Messages", Mail],
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await adminLogout();
      queryClient.clear();
      toast.success("Logged out.");
      navigate("/admin-panel/login", { replace: true });
    } catch {
      toast.error("Could not log out. Try again.");
    }
  }

  return (
    <DashboardLayout
      title="Admin panel"
      links={links}
      footer={
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-mist-soft hover:text-mist hover:bg-surface transition-colors"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Log out
        </button>
      }
    />
  );
}
