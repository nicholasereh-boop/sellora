import { LayoutDashboard, Link2, BarChart3, Receipt, Wallet, Landmark, ShieldCheck } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const links = [
  ["/affiliate/dashboard", "Dashboard", LayoutDashboard],
  ["/affiliate/links", "Referral links", Link2],
  ["/affiliate/analytics", "Analytics", BarChart3],
  ["/affiliate/conversions", "Conversions", Receipt],
  ["/affiliate/payouts", "Payouts", Wallet],
  ["/affiliate/bank-details", "Bank details", Landmark],
  ["/kyc/affiliate", "Verification", ShieldCheck],
];

export default function AffiliateLayout() {
  return <DashboardLayout title="Affiliate studio" links={links} />;
}
