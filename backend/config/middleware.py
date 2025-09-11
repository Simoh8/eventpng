import os
from django.utils.cache import add_never_cache_headers, patch_cache_control
from django.conf import settings

class MediaCacheControlMiddleware:
    """
    Middleware to add cache control headers to media files.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only process successful responses
        if response.status_code != 200:
            return response
            
        # Check if this is a media file request
        if hasattr(request, 'path') and request.path.startswith(settings.MEDIA_URL):
            # Add cache control headers
            patch_cache_control(
                response,
                public=True,
                max_age=settings.CACHE_CONTROL_MAX_AGE,
                s_maxage=settings.CACHE_CONTROL_MAX_AGE
            )
            
            # Add ETag header for conditional requests
            if hasattr(response, 'file_to_stream'):
                import hashlib
                import time
                etag = hashlib.md5(f"{response.file_to_stream.name}{os.path.getmtime(response.file_to_stream.name)}".encode()).hexdigest()
                response['ETag'] = f'"{etag}"'
        
        return response
