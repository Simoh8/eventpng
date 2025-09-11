from rest_framework import generics, permissions, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.http import Http404, JsonResponse, HttpResponseForbidden, HttpResponseServerError
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Event, Gallery, Photo, Download
from .serializers import GalleryListSerializer
from . import serializers
from accounts.permissions import IsOwnerOrReadOnly, IsPhotographer, IsStaffOrSuperuser

class StatsView(APIView):
    """
    API endpoint that returns statistics about the platform.
    Data is cached for 1 hour to improve performance.
    """
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(cache_page(60 * 60))  # Cache for 1 hour
    def get(self, request, format=None):
        cache_key = 'platform_stats'
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            return Response(cached_data)
            
        try:
            # Get counts from database
            stats = {
                'total_photos': Photo.objects.filter(is_public=True).count(),
                'total_galleries': Gallery.objects.filter(is_public=True).count(),
                'total_events': Event.objects.filter(privacy='public').count(),
                'total_photographers': get_user_model().objects.filter(
                    is_photographer=True, is_active=True
                ).count(),
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the result
            cache.set(cache_key, stats, timeout=60 * 60)  # Cache for 1 hour
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Error fetching platform stats: {str(e)}")
            return Response(
                {'error': 'Failed to fetch statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RecentGalleriesView(ListAPIView):
    """
    API endpoint that returns recently added public galleries.
    """
    serializer_class = GalleryListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Gallery.objects.filter(
            is_public=True,
            is_active=True
        ).select_related('event', 'photographer').order_by('-created_at')[:10]  # Get 10 most recent

class GalleryListView(generics.ListAPIView):
    """View for listing galleries."""
    serializer_class = serializers.GalleryListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_photographer:
            # Photographers can see all their galleries
            return Gallery.objects.filter(photographer=user).annotate(
                photo_count=Count('photos')
            )
        # Regular users can only see public galleries
        return Gallery.objects.filter(is_public=True).annotate(
            photo_count=Count('photos')
        )


class GalleryCreateView(generics.CreateAPIView):
    """View for creating galleries with photos."""
    queryset = Gallery.objects.all()
    serializer_class = serializers.GalleryCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsPhotographer]
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        # The photographer is now set in the serializer's create method
        gallery = serializer.save()
        
        # Process and save photos (moved to serializer)
        # The photos are now handled in the serializer's create method
        
        # Return the created gallery
        return gallery

    def process_image(self, photo):
        """Process the image to add watermark and optimize."""
        from .utils import process_image
        process_image(photo)

class GalleryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting a gallery."""
    queryset = Gallery.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return serializers.GalleryDetailSerializer
        return serializers.GalleryCreateUpdateSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_photographer:
            # Photographers can see all their galleries
            return Gallery.objects.filter(photographer=user)
        # Regular users can only see public galleries
        return Gallery.objects.filter(is_public=True)
    
    def get_object(self):
        try:
            # First try to get the gallery using the parent's get_object
            return super().get_object()
        except Http404:
            # If we get a 404, check if the gallery exists but user doesn't have access
            queryset = self.filter_queryset(self.get_queryset())
            obj = queryset.filter(id=self.kwargs.get('pk')).first()
            if obj and not obj.is_public and obj.photographer != self.request.user:
                # Gallery exists but is private and user is not the owner
                raise Http404("This gallery is private and you don't have permission to view it.")
            # Re-raise the original 404 if gallery doesn't exist at all
            raise Http404("Gallery not found.")

class PhotoListView(generics.ListCreateAPIView):
    """View for listing and creating photos in a gallery."""
    serializer_class = serializers.PhotoSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        gallery_id = self.kwargs.get('gallery_id')
        gallery = get_object_or_404(Gallery, id=gallery_id)
        
        # Check permissions
        if not gallery.is_public and gallery.photographer != self.request.user:
            return Photo.objects.none()
            
        return Photo.objects.filter(gallery_id=gallery_id).order_by('order', '-created_at')
    
    def perform_create(self, serializer):
        gallery_id = self.kwargs.get('gallery_id')
        gallery = get_object_or_404(Gallery, id=gallery_id)
        
        # Check if the user has permission to add photos to this gallery
        if gallery.photographer != self.request.user:
            raise PermissionDenied("You don't have permission to add photos to this gallery.")
        
        serializer.save(gallery=gallery)

class PhotoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting a photo."""
    serializer_class = serializers.PhotoSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        gallery_id = self.kwargs.get('gallery_id')
        return Photo.objects.filter(gallery_id=gallery_id)
    
    def get_object(self):
        queryset = self.get_queryset()
        photo_id = self.kwargs.get('photo_id')
        try:
            obj = queryset.get(id=photo_id)
            self.check_object_permissions(self.request, obj.gallery)
            return obj
        except (Photo.DoesNotExist, ValueError):
            raise Http404("Photo not found")

class DownloadPhotoView(generics.CreateAPIView):
    """View for downloading a photo (records the download)."""
    serializer_class = serializers.DownloadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        photo_id = self.kwargs.get('photo_id')
        try:
            photo = Photo.objects.get(id=photo_id)
        except (Photo.DoesNotExist, ValueError):
            return Response(
                {"detail": "Photo not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if the photo is public or the user has purchased it
        if not photo.is_public:
            # In a real app, you'd check if the user has purchased this photo
            # For now, we'll just check if they're the photographer
            if photo.gallery.photographer != request.user:
                return Response(
                    {"detail": "You don't have permission to download this photo."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Record the download
        download = Download.objects.create(
            user=request.user,
            photo=photo,
            ip_address=self.get_client_ip(request)
        )
        
        # In a real app, you'd serve the file here or redirect to a signed URL
        # For now, we'll just return the photo URL
        serializer = serializers.PhotoSerializer(photo)
        return Response(serializer.data)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class PublicGalleryListView(generics.ListAPIView):
    """View for listing public galleries (no authentication required)."""
    serializer_class = serializers.GalleryListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Gallery.objects.filter(is_public=True)
        
        # Filter by event if event_id is provided in query params
        event_id = self.request.query_params.get('event')
        if event_id:
            try:
                event_id = int(event_id)
                queryset = queryset.filter(event_id=event_id)
            except (ValueError, TypeError):
                pass  # Ignore invalid event_id
                
        return queryset.prefetch_related('photos')

class PublicGalleryDetailView(generics.RetrieveAPIView):
    """View for retrieving a public gallery (no authentication required)."""
    serializer_class = serializers.GalleryDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'pk'
    
    def get_queryset(self):
        return Gallery.objects.filter(is_public=True).prefetch_related('photos')
    
    def get_object(self):
        # Check if we're looking up by slug
        if 'slug' in self.kwargs:
            slug = self.kwargs['slug']
            try:
                return self.get_queryset().get(slug=slug)
            except Gallery.DoesNotExist:
                raise Http404("No Gallery matches the given slug.")
        # Default to ID-based lookup
        return super().get_object()

class PublicPhotoDetailView(generics.RetrieveAPIView):
    """View for retrieving a public photo (no authentication required)."""
    serializer_class = serializers.PhotoSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Photo.objects.filter(is_public=True, gallery__is_public=True)


from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie

class PublicPhotoListView(generics.ListAPIView):
    """
    View for listing public photos in a gallery (no authentication required).
    Cached for 1 hour to reduce database load.
    """
    serializer_class = serializers.PhotoSerializer
    permission_classes = [permissions.AllowAny]
    
    # Cache page for 1 hour (3600 seconds)
    @method_decorator(cache_page(60 * 60))
    @method_decorator(vary_on_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    pagination_class = None  # Or use PageNumberPagination with custom settings
    
    def get_queryset(self):
        gallery_id = self.kwargs.get('gallery_id')
        if not gallery_id:
            return Photo.objects.none()
            
        return Photo.objects.filter(
            gallery_id=gallery_id,
            is_public=True,
            gallery__is_public=True
        ).order_by('order', 'created_at')


class EventListView(generics.ListCreateAPIView):
    """
    View for listing and creating events.
    Photographers can see all events but can only create their own.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'location']
    ordering_fields = ['date', 'created_at']
    
    def get_serializer_class(self):
        # Use lightweight serializer for GET requests, full serializer for POST
        if self.request.method == 'GET':
            return serializers.EventListSerializer
        return serializers.EventSerializer
    
    def get_queryset(self):
        # Return all events for photographers, ordered by date (newest first)
        if self.request.user.is_photographer or self.request.user.is_superuser:
            return Event.objects.all().order_by('-date')
        # For regular users, only show their own events
        return Event.objects.filter(created_by=self.request.user).order_by('-date')
    
    def perform_create(self, serializer):
        # Automatically set the creator to the current user
        serializer.save(created_by=self.request.user)


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating, and deleting an event.
    Photographers can access any event, but can only modify their own.
    """
    serializer_class = serializers.EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Photographers can see all events, regular users only see their own
        if self.request.user.is_photographer or self.request.user.is_superuser:
            return Event.objects.prefetch_related('galleries').all()
        return Event.objects.filter(created_by=self.request.user).prefetch_related('galleries')
    
    def get_serializer_context(self):
        """Add request to serializer context for permission checks."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_permissions(self):
        """
        Only allow the event creator to update or delete the event.
        """
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            self.permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        return super().get_permissions()
    
    def perform_update(self, serializer):
        # Ensure the created_by field can't be changed
        serializer.save(created_by=self.request.user)
        
    def perform_destroy(self, instance):
        # Only allow deleting events created by the current user
        if instance.created_by != self.request.user and not self.request.user.is_superuser:
            raise exceptions.PermissionDenied("You can only delete your own events.")
        instance.delete()


import logging
logger = logging.getLogger(__name__)

class PublicEventListView(generics.ListAPIView):
    """View for listing all events (no authentication required)."""
    serializer_class = serializers.PublicEventSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Disable pagination for this view
    
    def get_queryset(self):
        # Return all events, but mark private ones as such in the serializer
        events = Event.objects.all().order_by('-date')
        logger.info(f'Returning {events.count()} events from PublicEventListView')
        return events
        
    def get_serializer_context(self):
        # Include the request in the serializer context for building absolute URLs
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class VerifyEventPinView(APIView):
    """View for verifying a private event's PIN."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        pin = request.data.get('pin', '')
        
        if event.privacy == 'public':
            return Response({'verified': True, 'event': serializers.EventSerializer(event).data})
            
        if event.pin == pin:
            return Response({
                'verified': True,
                'event': serializers.EventSerializer(event).data
            })
            
        return Response(
            {'error': 'Invalid PIN'}, 
            status=status.HTTP_403_FORBIDDEN
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def event_stats(request, event_id):
    """
    Get statistics for a specific event.
    Returns photo count, gallery count, and photographer count for the event.
    """
    try:
        event = Event.objects.get(pk=event_id)
        
        # Get photo count across all galleries in the event
        photo_count = Photo.objects.filter(gallery__event=event).count()
        
        # Get gallery count for the event
        gallery_count = event.galleries.count()
        
        # Get unique photographer count for the event
        photographer_count = event.galleries.values('photographer').distinct().count()
        
        return Response({
            'event_id': event.id,
            'event_name': event.name,
            'photo_count': photo_count,
            'gallery_count': gallery_count,
            'photographer_count': photographer_count,
            'is_public': event.privacy == 'public',
            'has_pin': bool(event.pin) and event.privacy == 'private'
        })
        
    except Event.DoesNotExist:
        return Response(
            {'error': 'Event not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
