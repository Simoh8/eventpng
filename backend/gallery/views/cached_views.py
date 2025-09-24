from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class HomepageView(APIView):
    """
    View that returns cached homepage data
    """
    def get(self, request, format=None):
        # Try to get data from cache
        cached_data = cache.get('homepage_data')
        
        if cached_data is None:
            # If cache is empty, trigger an async update and return empty data
            from gallery.tasks import update_homepage_cache, update_gallery_stats
            update_homepage_cache.delay()
            logger.warning("Cache miss for homepage data, triggering async update")
            return Response({
                'status': 'cache_miss',
                'message': 'Data is being updated. Please refresh in a moment.',
                'data': {}
            }, status=status.HTTP_202_ACCEPTED)
        
        return Response({
            'status': 'success',
            'data': cached_data
        })

class GalleryStatsView(APIView):
    """
    View that returns cached gallery statistics
    """
    def get(self, request, format=None):
        # Try to get stats from cache
        cached_stats = cache.get('gallery_stats')
        
        if cached_stats is None:
            # If cache is empty, trigger an async update and return empty data
            from gallery.tasks import update_gallery_stats
            update_gallery_stats.delay()
            logger.warning("Cache miss for gallery stats, triggering async update")
            return Response({
                'status': 'cache_miss',
                'message': 'Statistics are being updated. Please refresh in a moment.',
                'data': {}
            }, status=status.HTTP_202_ACCEPTED)
        
        return Response({
            'status': 'success',
            'data': cached_stats
        })
