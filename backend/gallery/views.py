from rest_framework import generics, permissions, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from .models import Event, Gallery, Photo, Download
from . import serializers
from accounts.permissions import IsOwnerOrReadOnly, IsPhotographer, IsStaffOrSuperuser

class GalleryListView(generics.ListCreateAPIView):
    """View for listing and creating galleries."""
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
    
    def perform_create(self, serializer):
        serializer.save(photographer=self.request.user)

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
        obj = get_object_or_404(queryset, id=self.kwargs.get('photo_id'))
        self.check_object_permissions(self.request, obj.gallery)
        return obj

class DownloadPhotoView(generics.CreateAPIView):
    """View for downloading a photo (records the download)."""
    serializer_class = serializers.DownloadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        photo_id = self.kwargs.get('photo_id')
        photo = get_object_or_404(Photo, id=photo_id)
        
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
        return Gallery.objects.filter(is_public=True).annotate(
            photo_count=Count('photos')
        )

class PublicGalleryDetailView(generics.RetrieveAPIView):
    """View for retrieving a public gallery (no authentication required)."""
    serializer_class = serializers.GalleryDetailSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Gallery.objects.filter(is_public=True)

class PublicPhotoDetailView(generics.RetrieveAPIView):
    """View for retrieving a public photo (no authentication required)."""
    serializer_class = serializers.PhotoSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Photo.objects.filter(is_public=True, gallery__is_public=True)


class EventListView(generics.ListCreateAPIView):
    """View for listing and creating events."""
    serializer_class = serializers.EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'location']
    ordering_fields = ['date', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Event.objects.all()
        return Event.objects.filter(created_by=user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting an event."""
    serializer_class = serializers.EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrSuperuser]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Event.objects.all()
        return Event.objects.filter(created_by=user)


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


class VerifyEventPinView(APIView):
    """View for verifying a private event's PIN."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, slug):
        pin = request.data.get('pin')
        if not pin:
            return Response(
                {'detail': 'PIN is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event = get_object_or_404(Event, slug=slug, privacy='private')
        if event.pin == pin:
            # In a production app, you might want to set a session or JWT here
            return Response({'valid': True, 'event': serializers.EventSerializer(event).data})
        
        return Response(
            {'detail': 'Invalid PIN'}, 
            status=status.HTTP_403_FORBIDDEN
        )
