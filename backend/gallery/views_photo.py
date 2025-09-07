from django.http import Http404
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Photo

class ProtectedImageView(APIView):
    """View for serving protected images with watermarks."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, photo_id, *args, **kwargs):
        try:
            photo = Photo.objects.get(id=photo_id)
            
            # Check if user has permission to view this photo
            if not self._can_view_photo(request.user, photo):
                return Response(
                    {"detail": "You don't have permission to view this image."},
                    status=403
                )
            
            # Serve the protected image
            return photo.serve_protected_image(request)
            
        except Photo.DoesNotExist:
            raise Http404("Image not found")
    
    def _can_view_photo(self, user, photo):
        """Check if the user has permission to view the photo."""
        # Allow photographers to view their own photos
        if photo.gallery.photographer == user:
            return True
            
        # Allow superusers to view all photos
        if user.is_superuser:
            return True
            
        # Check if the photo is in a public gallery
        if photo.gallery.is_public:
            return True
            
        # Check if the user has purchased the gallery
        if hasattr(user, 'purchased_galleries') and user.purchased_galleries.filter(id=photo.gallery.id).exists():
            return True
            
        return False
