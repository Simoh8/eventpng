from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

class CacheControlMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Cache media files for 1 day (86400 seconds)
        if request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=86400'
            response['Vary'] = 'Accept-Encoding'
        return response
