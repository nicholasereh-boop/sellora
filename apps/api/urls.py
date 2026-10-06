"""
Top-level /api/ namespace (roadmap Phase 2).

Each domain's endpoints live beside that Django app
(apps/<name>/api/urls.py) per the roadmap's "preferred long-term
structure" and are included here. Every domain in the roadmap is now
wired in (see docs/react-migration/PROGRESS.md for what each one
actually covers on the React side).
"""
from django.urls import include, path

from .views import csrf_bootstrap_view

urlpatterns = [
    path("csrf/", csrf_bootstrap_view, name="csrf_bootstrap"),
    path("auth/", include("apps.accounts.api.urls")),
    path("catalog/", include("apps.catalog.api.urls")),
    path("cart/", include("apps.cart.api.urls")),
    # orders.api.urls defines its own "checkout/" and "orders/" prefixes
    # internally (see apps/orders/api/urls.py), so it's included at the
    # root rather than nested under another prefix here.
    path("", include("apps.orders.api.urls")),
    path("payments/", include("apps.payments.api.urls")),
    path("notifications/", include("apps.notifications.api.urls")),
    path("sellers/", include("apps.sellers.api.urls")),
    path("affiliates/", include("apps.affiliates.api.urls")),
    path("riders/", include("apps.riders.api.urls")),
    path("logistics/", include("apps.logistics.api.urls")),
    path("kyc/", include("apps.kyc.api.urls")),
    # admin_api is not a Django app under apps/<name>/api/ like the
    # others - it's the API for the top-level "apps" (MainConfig) app's
    # own custom admin area (apps/views.py), given its own top-level
    # package to avoid colliding with this file's own home (apps/api/).
    path("admin/", include("apps.admin_api.urls")),
]
