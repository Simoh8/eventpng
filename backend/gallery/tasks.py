from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task
def update_homepage_cache():
    """
    Task to update homepage cache with fresh data
    """
    from gallery.models import Photo, Gallery, Event
    from django.db.models import Count, Max
    
    try:
        # Get recent photos with like counts
        recent_photos = Photo.objects.filter(is_public=True).select_related('gallery', 'photographer') \
            .annotate(like_count=Count('likes')) \
            .order_by('-created_at')[:12]
        
        # Get upcoming events
        upcoming_events = Event.objects.filter(is_public=True, date__gte=timezone.now()) \
            .order_by('date')[:6]
        
        # Get popular galleries
        popular_galleries = Gallery.objects.filter(is_public=True) \
            .annotate(photo_count=Count('photos'), like_count=Count('photos__likes')) \
            .order_by('-like_count')[:6]
        
        # Prepare cache data
        cache_data = {
            'recent_photos': recent_photos,
            'upcoming_events': upcoming_events,
            'popular_galleries': popular_galleries,
            'last_updated': timezone.now().isoformat()
        }
        
        # Set cache with 1-hour expiration
        cache.set('homepage_data', cache_data, 3600)
        logger.info("Successfully updated homepage cache")
        return True
        
    except Exception as e:
        logger.error(f"Error updating homepage cache: {str(e)}")
        return False

@shared_task
def update_gallery_stats():
    """
    Task to update gallery statistics and cache them
    """
    from gallery.models import Gallery, Photo
    from django.db.models import Count, Avg
    
    try:
        # Get gallery statistics
        stats = {
            'total_galleries': Gallery.objects.filter(is_public=True).count(),
            'total_photos': Photo.objects.filter(is_public=True).count(),
            'avg_photos_per_gallery': Gallery.objects.filter(is_public=True) \
                .annotate(photo_count=Count('photos')) \
                .aggregate(avg=Avg('photo_count'))['avg'] or 0,
            'last_updated': timezone.now().isoformat()
        }
        
        # Cache the stats for 24 hours
        cache.set('gallery_stats', stats, 86400)
        logger.info("Successfully updated gallery statistics")
        return True
        
    except Exception as e:
        logger.error(f"Error updating gallery stats: {str(e)}")
        return False
