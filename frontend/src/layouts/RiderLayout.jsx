import { LayoutDashboard, Navigation, PackageCheck, Truck, History, UserCircle, Wallet, Landmark, ShieldCheck } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const links = [
  ["/rider/dashboard", "Dashboard", LayoutDashboard],
  ["/rider/active-delivery", "Active delivery", Navigation],
  ["/rider/pickups", "Pickups", PackageCheck],
  ["/rider/deliveries", "Deliveries", Truck],
  ["/rider/activity", "Activity", History],
  ["/rider/earnings", "Earnings", Wallet],
  ["/rider/profile", "Profile", UserCircle],
  ["/rider/bank-details", "Bank details", Landmark],
  ["/kyc/rider", "Verification", ShieldCheck],
];

export default function RiderLayout() {
  return <DashboardLayout title="Rider studio" links={links} light />;
}
