"""
Serializers for the accounts API.

Deliberately thin: these describe shapes for React, they do not
reimplement validation that already lives in apps.accounts.forms
(RegisterForm, LoginForm, ProfileForm). Where a form already validates
something (unique email, password rules, ...), the API view below calls
that same form instead of duplicating its `clean_*` methods here.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "first_name",
            "last_name",
            "phone",
            "country",
            "avatar",
            "bio",
        )


class CurrentUserSerializer(serializers.ModelSerializer):
    """Shape returned by GET /api/auth/me/."""

    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "date_joined",
            "profile",
        )
