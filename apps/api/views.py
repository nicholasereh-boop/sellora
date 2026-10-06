from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_bootstrap_view(request):
    """
    GET /api/csrf/

    Ensures the csrftoken cookie is set. React's client calls this once
    on startup (before any POST/PATCH/DELETE) since there's no Django-
    rendered <form> anywhere in the SPA to plant the cookie for it -
    see roadmap Phase 4.
    """
    get_token(request)
    return Response({"success": True, "data": {"detail": "CSRF cookie set."}})
