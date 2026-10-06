import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RouteFallback from "./components/RouteFallback";
import PublicLayout from "./layouts/PublicLayout";
import RequireAuth from "./routes/RequireAuth";
import RequireApprovedSeller from "./routes/RequireApprovedSeller";
import ProductList from "./pages/catalog/ProductList";
import ProductDetail from "./pages/catalog/ProductDetail";
import PublicStorePage from "./pages/catalog/PublicStorePage";
import CartPage from "./pages/cart/CartPage";
import CheckoutPage from "./pages/checkout/CheckoutPage";
import OrderList from "./pages/orders/OrderList";
import OrderDetail from "./pages/orders/OrderDetail";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import PaymentResultPage from "./pages/checkout/PaymentResultPage";
import AccountPage from "./pages/account/AccountPage";
import ProfilePage from "./pages/account/ProfilePage";
import NotificationsPage from "./pages/account/NotificationsPage";
import RequireActiveAffiliate from "./routes/RequireActiveAffiliate";
import RequireApprovedRider from "./routes/RequireApprovedRider";
import BuyerKYCPage from "./pages/kyc/BuyerKYCPage";
import RequireAdmin from "./routes/RequireAdmin";

// Code-split (roadmap follow-up: the ~900kB single-bundle warning
// noted in PROGRESS.md). Every seller/affiliate/rider/admin/KYC page,
// their shells, and anything they pull in (recharts, react-hook-form
// resolvers, etc.) become their own chunk, fetched only when a visitor
// actually opens that section. Storefront pages (products, cart,
// checkout, orders, account, buyer KYC) stay static imports below -
// those are what most visitors need immediately, so there's nothing to
// gain by deferring them, only a loading flicker to lose.
const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const SellerApplyPage = lazy(() => import("./pages/seller/SellerApplyPage"));
const SellerStatusPage = lazy(() => import("./pages/seller/SellerStatusPage"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerProductList = lazy(() => import("./pages/seller/SellerProductList"));
const SellerProductForm = lazy(() => import("./pages/seller/SellerProductForm"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerPayouts = lazy(() => import("./pages/seller/SellerPayouts"));
const SellerStoreSettings = lazy(() => import("./pages/seller/SellerStoreSettings"));
const SellerBankDetails = lazy(() => import("./pages/seller/SellerBankDetails"));
const SellerFulfillments = lazy(() => import("./pages/seller/SellerFulfillments"));
const AffiliateLayout = lazy(() => import("./layouts/AffiliateLayout"));
const AffiliateApplyPage = lazy(() => import("./pages/affiliate/AffiliateApplyPage"));
const AffiliateStatusPage = lazy(() => import("./pages/affiliate/AffiliateStatusPage"));
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));
const AffiliateLinks = lazy(() => import("./pages/affiliate/AffiliateLinks"));
const AffiliateLinkDetail = lazy(() => import("./pages/affiliate/AffiliateLinkDetail"));
const AffiliateAnalytics = lazy(() => import("./pages/affiliate/AffiliateAnalytics"));
const AffiliateConversions = lazy(() => import("./pages/affiliate/AffiliateConversions"));
const AffiliateBankDetails = lazy(() => import("./pages/affiliate/AffiliateBankDetails"));
const AffiliatePayouts = lazy(() => import("./pages/affiliate/AffiliatePayouts"));
const RiderLayout = lazy(() => import("./layouts/RiderLayout"));
const RiderApplyPage = lazy(() => import("./pages/rider/RiderApplyPage"));
const RiderStatusPage = lazy(() => import("./pages/rider/RiderStatusPage"));
const RiderDashboard = lazy(() => import("./pages/rider/RiderDashboard"));
const RiderActiveDelivery = lazy(() => import("./pages/rider/RiderActiveDelivery"));
const RiderActivity = lazy(() => import("./pages/rider/RiderActivity"));
const RiderEarnings = lazy(() => import("./pages/rider/RiderEarnings"));
const RiderProfile = lazy(() => import("./pages/rider/RiderProfile"));
const RiderBankDetails = lazy(() => import("./pages/rider/RiderBankDetails"));
const RiderPickupTasks = lazy(() => import("./pages/rider/RiderPickupTasks"));
const RiderDeliveryTasks = lazy(() => import("./pages/rider/RiderDeliveryTasks"));
const SellerKYCPage = lazy(() => import("./pages/kyc/SellerKYCPage"));
const AffiliateKYCPage = lazy(() => import("./pages/kyc/AffiliateKYCPage"));
const RiderKYCPage = lazy(() => import("./pages/kyc/RiderKYCPage"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminApplications = lazy(() => import("./pages/admin/AdminApplications"));

// Only routes whose API exists today (accounts, catalog, cart, orders,
// payments, notifications, sellers, affiliates, riders - see
// docs/react-migration/PROGRESS.md) are wired up. Logistics/kyc/admin
// routes are added phase by phase as their /api/ namespaces land, per
// the roadmap's strangler migration strategy (Phase 23) - not stubbed
// out ahead of time.
export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<ProductList />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="store/:slug" element={<PublicStorePage />} />

          {/* Staff sign-in for the custom admin (Phase 16). Lives at
              /admin-panel/*, NOT /admin/* - Django's own /admin/ stays
              untouched (see PROGRESS.md for why this deviates from the
              Phase 17 route tree). No staff sign-up page on purpose. */}
          <Route path="admin-panel/login" element={<AdminLoginPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route
            path="checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="orders"
            element={
              <RequireAuth>
                <OrderList />
              </RequireAuth>
            }
          />
          <Route
            path="orders/:reference"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email/:uid/:token" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password/:uid/:token" element={<ResetPasswordPage />} />
          <Route path="payment/result/:reference" element={<PaymentResultPage />} />
          <Route
            path="account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="account/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="kyc/buyer"
            element={
              <RequireAuth>
                <BuyerKYCPage />
              </RequireAuth>
            }
          />
          <Route
            path="notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />

          {/* Seller application flow - not gated by RequireApprovedSeller,
              since an unapproved user needs to reach these precisely
              because they aren't approved yet. */}
          <Route
            path="sell/apply"
            element={
              <RequireAuth>
                <SellerApplyPage />
              </RequireAuth>
            }
          />
          <Route
            path="sell/status"
            element={
              <RequireAuth>
                <SellerStatusPage />
              </RequireAuth>
            }
          />

          {/* Affiliate application flow - same pattern as the seller flow
              above. */}
          <Route
            path="affiliate/apply"
            element={
              <RequireAuth>
                <AffiliateApplyPage />
              </RequireAuth>
            }
          />
          <Route
            path="affiliate/status"
            element={
              <RequireAuth>
                <AffiliateStatusPage />
              </RequireAuth>
            }
          />

          {/* Rider application flow - same pattern as seller/affiliate
              above. */}
          <Route
            path="rider/apply"
            element={
              <RequireAuth>
                <RiderApplyPage />
              </RequireAuth>
            }
          />
          <Route
            path="rider/status"
            element={
              <RequireAuth>
                <RiderStatusPage />
              </RequireAuth>
            }
          />
        </Route>

        {/* Seller dashboard - own layout (sidebar nav), gated on an
            approved seller profile rather than just being logged in. */}
        <Route
          path="/seller"
          element={
            <RequireApprovedSeller>
              <SellerLayout />
            </RequireApprovedSeller>
          }
        >
          <Route path="dashboard" element={<SellerDashboard />} />
          <Route path="products" element={<SellerProductList />} />
          <Route path="products/new" element={<SellerProductForm />} />
          <Route path="products/:id/edit" element={<SellerProductForm />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="payouts" element={<SellerPayouts />} />
          <Route path="store-settings" element={<SellerStoreSettings />} />
          <Route path="bank-details" element={<SellerBankDetails />} />
          <Route path="fulfillment" element={<SellerFulfillments />} />
        </Route>

        {/* Affiliate dashboard - same shell as seller, gated on an active
            affiliate profile. Attribution itself (which affiliate a visit
            or order is credited to) stays entirely server-side in
            apps.affiliates.middleware - nothing here recomputes it. */}
        <Route
          path="/affiliate"
          element={
            <RequireActiveAffiliate>
              <AffiliateLayout />
            </RequireActiveAffiliate>
          }
        >
          <Route path="dashboard" element={<AffiliateDashboard />} />
          <Route path="links" element={<AffiliateLinks />} />
          <Route path="links/:id" element={<AffiliateLinkDetail />} />
          <Route path="analytics" element={<AffiliateAnalytics />} />
          <Route path="conversions" element={<AffiliateConversions />} />
          <Route path="payouts" element={<AffiliatePayouts />} />
          <Route path="bank-details" element={<AffiliateBankDetails />} />
        </Route>

        {/* Rider dashboard - same shell as seller/affiliate, gated on an
            approved rider profile. Task actions (accept, mark collected,
            mark delivered) stay in Phase 12 (logistics) - not here. */}
        <Route
          path="/rider"
          element={
            <RequireApprovedRider>
              <RiderLayout />
            </RequireApprovedRider>
          }
        >
          <Route path="dashboard" element={<RiderDashboard />} />
          <Route path="active-delivery" element={<RiderActiveDelivery />} />
          <Route path="pickups" element={<RiderPickupTasks />} />
          <Route path="deliveries" element={<RiderDeliveryTasks />} />
          <Route path="activity" element={<RiderActivity />} />
          <Route path="earnings" element={<RiderEarnings />} />
          <Route path="profile" element={<RiderProfile />} />
          <Route path="bank-details" element={<RiderBankDetails />} />
        </Route>

        {/* KYC (Phase 13) - the roadmap specifies these as flat /kyc/*
            routes rather than nested under each portal's own path, but
            they still render inside that portal's shell and are gated by
            that portal's own approved-profile guard, exactly like every
            other page in it. Buyer KYC (above, inside PublicLayout) needs
            no such guard - any authenticated buyer can submit it. */}
        <Route
          path="/kyc/seller"
          element={
            <RequireApprovedSeller>
              <SellerLayout />
            </RequireApprovedSeller>
          }
        >
          <Route index element={<SellerKYCPage />} />
        </Route>
        <Route
          path="/kyc/affiliate"
          element={
            <RequireActiveAffiliate>
              <AffiliateLayout />
            </RequireActiveAffiliate>
          }
        >
          <Route index element={<AffiliateKYCPage />} />
        </Route>
        <Route
          path="/kyc/rider"
          element={
            <RequireApprovedRider>
              <RiderLayout />
            </RequireApprovedRider>
          }
        >
          <Route index element={<RiderKYCPage />} />
        </Route>

        {/* Custom admin area (Phase 16). Guarded by RequireAdmin (UX only -
            every /api/admin/* endpoint re-checks is_staff/is_superuser). */}
        <Route
          path="/admin-panel"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="applications/:role" element={<AdminApplications />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

