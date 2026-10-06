"""
Account emails. Moved out of apps/accounts/views.py when the Django
template pages were retired - the verification link now points at the
React app (FRONTEND_URL/verify-email/<uid>/<token>), which confirms it
through POST /api/auth/verify-email/.
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token


def send_verification_email(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{uid}/{token}"

    context = {"user": user, "verify_url": verify_url}
    text_content = render_to_string("accounts/verification_email.txt", context)
    html_content = render_to_string("accounts/verification_email.html", context)

    email = EmailMultiAlternatives(
        "Verify your TopTech account",
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)
