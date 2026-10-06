import { LayoutDashboard, Package, ClipboardList, Truck, Wallet, Store, Landmark, ShieldCheck } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const links = [
  ["/seller/dashboard", "Dashboard", LayoutDashboard],
  ["/seller/products", "Products", Package],
  ["/seller/orders", "Orders", ClipboardList],
  ["/seller/fulfillment", "Fulfillment", Truck],
  ["/seller/payouts", "Payouts", Wallet],
  ["/seller/store-settings", "Store settings", Store],
  ["/seller/bank-details", "Bank details", Landmark],
  ["/kyc/seller", "Verification", ShieldCheck],
];

export default function SellerLayout() {
  return <DashboardLayout title="Seller studio" links={links} light />;
}
