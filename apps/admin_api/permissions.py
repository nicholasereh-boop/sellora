from rest_framework.permissions import BasePermission


class IsAdminStaff(BasePermission):
    """
    Mirrors apps.views.is_admin(user) exactly: is_staff or is_superuser.
    Used instead of DRF's own IsAdminUser (which only checks is_staff)
    so superusers who aren't flagged is_staff still get through, same
    as the existing @user_passes_test(is_admin) decorator.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )
