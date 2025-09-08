from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the gallery.
        if hasattr(obj, 'photographer'):
            return obj.photographer == request.user
        return obj == request.user

class IsPhotographer(permissions.BasePermission):
    """
    Permission to only allow photographers to perform certain actions.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_photographer

class IsOwner(permissions.BasePermission):
    """
    Permission to only allow owners of an object to access it.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'photographer'):
            return obj.photographer == request.user
        return obj == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow admin users to edit objects.
    Read-only for non-admin users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsStaffOrSuperuser(permissions.BasePermission):
    """
    Permission to only allow staff members or superusers to access a view.
    """
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)
