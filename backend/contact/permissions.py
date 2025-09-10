from rest_framework import permissions

class AllowAny(permissions.AllowAny):
    """
    Allow any access, regardless of authentication.
    This is a workaround for the global IsAuthenticated permission.
    """
    def has_permission(self, request, view):
        return True
