import os
from pathlib import Path

from dotenv import load_dotenv

"""
Django settings for the toptech (NICO_APP) project.

See https://docs.djangoproject.com/en/6.0/topics/settings/ for a full
list of settings and their values.
"""

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# Security
# https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

SECRET_KEY = os.environ.get("SECRET_KEY")




# Symmetric key for encrypting sensitive KYC fields (apps.core.fields.EncryptedCharField).
# Deliberately separate from SECRET_KEY - rotating one shouldn't force rotating the other.
# Generate with:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# then put it in .env as KYC_FIELD_ENCRYPTION_KEY. Never commit the real value.
KYC_FIELD_ENCRYPTION_KEY = os.environ.get("KYC_FIELD_ENCRYPTION_KEY")







DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "ALLOWED_HOSTS", "localhost,127.0.0.1"
    ).split(",")
    if host.strip()
]
AUTH_USER_MODEL = "accounts.User"

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "corsheaders",
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    "apps.apps.MainConfig",
    "apps.core.apps.CoreConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.catalog.apps.CatalogConfig",
    "apps.cart.apps.CartConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.payments.apps.PaymentsConfig",
    "apps.delivery.apps.DeliveryConfig",
    "apps.sellers.apps.SellersConfig",
    "apps.affiliates.apps.AffiliatesConfig",
    "apps.riders.apps.RidersConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.ledger.apps.LedgerConfig",
    "apps.kyc.apps.KycConfig",
    "apps.logistics.apps.LogisticsConfig",
]

# Required by django-allauth SocialApp.sites.
# The Site with this ID is used by the allauth Sites framework.
SITE_ID = 1

# NOTE: these three are for the separate staff/admin login flow (whatever
# owns the 'custom_login' / 'admin_dashboard' url names) and are left as
# they were - the customer-facing accounts app below has its own login/
# signup/Google views and does not use these.
LOGIN_URL = "custom_login"
LOGIN_REDIRECT_URL = "admin_dashboard"
LOGOUT_REDIRECT_URL = "custom_login"

# (Customer sign-in is the React app now; the Google flow's landing page is
# FRONTEND_URL via apps/accounts/adapters.py. The Django-side login above is
# staff-only, so the redirect stays on the staff dashboard.)

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.affiliates.middleware.AffiliateTrackingMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    'allauth.account.middleware.AccountMiddleware',
]
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Makes a returning user's "Continue with Google" work even when they
# originally signed up with username/password on the same email, instead
# of allauth's default "email already registered" error - see
# apps/accounts/adapters.py.
ACCOUNT_ADAPTER = 'apps.accounts.adapters.AccountAdapter'
SOCIALACCOUNT_ADAPTER = 'apps.accounts.adapters.SocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = True          # skip allauth's own "pick a username" page
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'  # Google already verified it
SOCIALACCOUNT_QUERY_EMAIL = True

# React migration - Google login handoff (roadmap: "Google authentication
# should continue to use the existing allauth flow, with only the React
# redirect/callback behavior adapted as necessary").
#
# Recent allauth versions render an intermediate "Continue?" confirmation
# page on a plain GET to the provider login url, as a CSRF precaution.
# True here means a plain <a href="/accounts/google/login/"> goes straight
# to Google's consent screen - safe because GET requests can't be forged
# into a state-changing action the way a POST can, and clicking a link is
# itself the user's confirmation.
SOCIALACCOUNT_LOGIN_ON_GET = True

# Where apps.accounts.adapters sends the browser after allauth's Google
# flow completes - the React app's own origin, not a Django template
# page, since the whole customer frontend is React now. An absolute URL
# because in production Django and the built React app are typically
# different origins/ports behind the same Nginx, not just different
# paths. In dev, vite.config.js proxies /accounts/ to Django so the
# whole button-click-to-callback chain stays on localhost:5173 from the
# browser's point of view and this only matters for the final redirect.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")




ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "ecommerce_db"),
        "USER": os.environ.get("DB_USER", "database_admin"),
        "PASSWORD": os.environ.get("DB_PASSWORD"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}






GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": GOOGLE_CLIENT_ID,
            "secret": GOOGLE_CLIENT_SECRET,
            "key": "",
        },
        "SCOPE": [
            "profile",
            "email",
        ],
        "AUTH_PARAMS": {
            "access_type": "online",
        },
    }
}




# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Email
# In development, print emails to the console unless SMTP creds are set.

if os.environ.get("EMAIL_HOST_PASSWORD"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "/static/"

STATICFILES_DIRS = [BASE_DIR / "static"]

STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files (user uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Third-party services

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_PUBLIC_KEY = os.environ.get("STRIPE_PUBLIC_KEY")

PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY")
PAYSTACK_WEBHOOK_URL = os.environ.get(
    "PAYSTACK_WEBHOOK_URL",
    "https://toptech.pythonanywhere.com/webhook/paystack/",
)



# Phase 6 - referral tracking. How long a ?ref=<code> click stays
# attributed to a visitor (spec section 12: "configurable through
# settings rather than hard-coded throughout the application").
AFFILIATE_ATTRIBUTION_WINDOW_DAYS = int(
    os.environ.get("AFFILIATE_ATTRIBUTION_WINDOW_DAYS", "30")
)

# Phase 9 - seller/affiliate payouts (spec sections 19/20). Configurable
# per spec's own pattern above rather than hard-coded in services.py.
MINIMUM_SELLER_WITHDRAWAL = os.environ.get("MINIMUM_SELLER_WITHDRAWAL", "1000")
MINIMUM_AFFILIATE_WITHDRAWAL = os.environ.get("MINIMUM_AFFILIATE_WITHDRAWAL", "1000")


# ---------------------------------------------------------------------------
# React migration (docs/react-migration) - Phase 2 API foundation,
# Phase 3 auth bridge, Phase 4 CSRF/CORS.
#
# The React/Vite dev server (localhost:5173) is a *different origin* than
# Django (localhost:8000), so it needs explicit CORS + CSRF-trusted-origin
# entries below. In production the recommended setup is same-origin
# (Nginx serves the built React app and proxies /api/ to Django), in which
# case these dev origins are simply unused rather than a security hole.
# Session auth (not JWT) is used deliberately - see roadmap Phase 3 - so the
# existing django-allauth/session/CSRF stack stays authoritative and is not
# duplicated.
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Re-added after syncing this file with an uploaded copy that predated
    # this block - every plain generics.ListAPIView without its own
    # pagination_class (catalog's ProductListView, sellers' public
    # PublicStoreProductListView) depends on this for the {count, next,
    # previous, results} shape the React frontend already expects.
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,
    # NOTE: do not set UNAUTHENTICATED_USER to None. The auth, cart and
    # checkout views all call request.user.is_authenticated for anonymous
    # visitors, which needs DRF's default AnonymousUser (None crashes them).
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

# Readable by React's fetch/axios via document.cookie so it can echo the
# token back in the X-CSRFToken header (CsrfViewMiddleware default,
# HttpOnly=False, is required for this - do not set CSRF_COOKIE_HTTPONLY).
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_COOKIE_NAME = "csrftoken"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"