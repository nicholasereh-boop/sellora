"""
URL configuration for toptech project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Django's own admin site (/admin/) and the staff-only custom admin
    # pages in apps.urls (/admin-panel/..., /dashboard/...) are the only
    # server-rendered pages left. Everything customers, sellers,
    # affiliates and riders see is the React app, which talks to /api/.
    path('admin/', admin.site.urls),
    path("api/", include("apps.api.urls")),
    # Server-to-server / browser-bounce endpoints only (no pages):
    # Paystack webhook + post-payment callback, and digital downloads.
    path("payments/", include("apps.payments.urls")),
    path("orders/", include("apps.orders.urls")),
    # django-allauth - kept solely for the Google OAuth redirect/callback.
    path('accounts/', include('allauth.urls')),
    path('', include('apps.urls')),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )