"""
Auth bridge API (roadmap Phase 3) for the React frontend.

These views are a thin HTTP/JSON wrapper around the *existing*
Django-session authentication, the existing RegisterForm/LoginForm/
ProfileForm validation, and the existing verification-email helper.
No password hashing, cart-merge, or verification logic is reimplemented
here - it's imported straight from apps.accounts.views / apps.accounts.forms
so there is exactly one implementation of each rule, matching the
migration's "reuse, don't duplicate" principle.
"""
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.cart.services import merge_guest_cart_into_user

from ..forms import LoginForm, ProfileForm, RegisterForm
from ..models import UserProfile
from ..emails import send_verification_email as _send_verification_email
from ..tokens import email_verification_token
from .serializers import CurrentUserSerializer, UserProfileSerializer

User = get_user_model()


def _form_errors(form):
    """Flatten a Django form's errors into {field: [messages]} for JSON."""
    return {field: [str(e) for e in errs] for field, errs in form.errors.items()}


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    if request.user.is_authenticated:
        return Response(
            {"success": False, "error": {"code": "ALREADY_AUTHENTICATED",
             "message": "Already logged in."}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    form = RegisterForm(request.data)
    if not form.is_valid():
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "Please correct the highlighted fields.",
             "fields": _form_errors(form)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = form.save(commit=False)
    user.is_active = False
    user.save()

    UserProfile.objects.create(
        user=user,
        first_name=form.cleaned_data["first_name"],
        last_name=form.cleaned_data["last_name"],
        phone=form.cleaned_data["phone"],
    )

    _send_verification_email(request, user)

    return Response({
        "success": True,
        "data": {"message": "Account created. Check your email for a verification link."},
    }, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def login_view(request):
    if request.user.is_authenticated:
        return Response({
            "success": True,
            "data": CurrentUserSerializer(request.user).data
        })

    form = LoginForm(request.data)

    if not form.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Enter a username and password.",
                    "fields": _form_errors(form),
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = form.cleaned_data["username"]
    password = form.cleaned_data["password"]

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        existing = User.objects.filter(username=username).first()

        if (
            existing is not None
            and not existing.is_active
            and existing.check_password(password)
        ):
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "EMAIL_NOT_VERIFIED",
                        "message": "Please verify your email before logging in.",
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "success": False,
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid username or password.",
                },
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    merge_guest_cart_into_user(request, user)

    login(request, user)

    return Response({
        "success": True,
        "data": CurrentUserSerializer(user).data,
    })

@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)

    return Response({
        "success": True,
        "data": {
            "message": "Logged out."
        }
    })
@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response({
        "success": True,
        "data": CurrentUserSerializer(request.user).data
    })

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response({"success": True, "data": UserProfileSerializer(profile).data})

    form = ProfileForm(request.data, request.FILES, instance=profile)
    if not form.is_valid():
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "Please correct the highlighted fields.",
             "fields": _form_errors(form)}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    form.save()
    return Response({"success": True, "data": UserProfileSerializer(profile).data})


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification_view(request):
    email = (request.data.get("email") or "").strip().lower()
    user = User.objects.filter(email__iexact=email, is_active=False).first()
    if user is not None:
        _send_verification_email(request, user)
    # Always the same response, whether or not the account exists/needs
    # it - don't leak account existence through response differences.
    return Response({"success": True, "data": {
        "message": "If an account needs verification, an email has been sent.",
    }})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_view(request):
    # Reuses Django's own PasswordResetForm - the exact same class and
    # the exact same templates the existing accounts:password_reset
    # (template) view uses, so the emailed link/token behavior is
    # identical between the two frontends.
    form = PasswordResetForm(request.data)
    if not form.is_valid():
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "Enter a valid email address.",
             "fields": _form_errors(form)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    form.save(
        request=request,
        email_template_name="accounts/password_reset_email.txt",
        subject_template_name="accounts/password_reset_subject.txt",
        # The emailed link opens the React reset page, not a Django one.
        extra_email_context={"frontend_url": settings.FRONTEND_URL.rstrip("/")},
    )
    # Always success, whether or not the email is registered - avoids
    # leaking account existence.
    return Response({"success": True, "data": {
        "message": "If that email is registered, a reset link has been sent.",
    }})


def _user_from_uid(uidb64):
    try:
        return User.objects.get(pk=force_str(urlsafe_base64_decode(uidb64)))
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email_view(request):
    """POST {uid, token} - activates the account (the emailed link's target)."""
    user = _user_from_uid(request.data.get("uid", ""))
    if user is None or not email_verification_token.check_token(user, request.data.get("token", "")):
        return Response(
            {"success": False, "error": {"code": "INVALID_LINK",
             "message": "Verification link is invalid or has expired."}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.is_active = True
    user.save(update_fields=["is_active"])
    return Response({"success": True, "data": {"message": "Email verified! You can now log in."}})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """POST {uid, token, new_password1, new_password2} - completes a reset."""
    user = _user_from_uid(request.data.get("uid", ""))
    if user is None or not default_token_generator.check_token(user, request.data.get("token", "")):
        return Response(
            {"success": False, "error": {"code": "INVALID_LINK",
             "message": "This reset link is invalid or has expired."}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    form = SetPasswordForm(user, request.data)
    if not form.is_valid():
        return Response(
            {"success": False, "error": {"code": "VALIDATION_ERROR",
             "message": "Please correct the highlighted fields.",
             "fields": _form_errors(form)}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    form.save()
    return Response({"success": True, "data": {"message": "Password updated. You can now log in."}})
