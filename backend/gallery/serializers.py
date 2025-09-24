from django.db.models import Count
from rest_framework import serializers
from .models import Event, Gallery, Photo, Download, Like
from accounts.serializers import UserSerializer

class LikeSerializer(serializers.ModelSerializer):
    """Serializer for photo likes."""
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'user', 'photo', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
        extra_kwargs = {
            'photo': {'write_only': True}
        }


class PhotoSerializer(serializers.ModelSerializer):
    """Serializer for photos in galleries."""
    image_url = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Photo
        fields = [
            'id', 'title', 'description', 'image', 'image_url', 
            'width', 'height', 'created_at', 'is_liked', 'like_count'
        ]
        read_only_fields = ['id', 'created_at', 'is_liked', 'like_count']
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None
        
    def get_is_liked(self, obj):
        """Check if the current user has liked this photo."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
        
    def get_like_count(self, obj):
        """Get the total number of likes for this photo."""
        return obj.likes.count()

class GalleryWithPhotosSerializer(serializers.ModelSerializer):
    """Serializer for galleries that includes their photos."""
    photos = PhotoSerializer(many=True, read_only=True, context={'request': None})
    
    class Meta:
        model = Gallery
        fields = ['id', 'title', 'description', 'cover_photo', 'photos', 'created_at']
        read_only_fields = ['id', 'created_at']

class PublicEventDetailSerializer(serializers.ModelSerializer):
    """Serializer for public event detail with galleries and photos."""
    galleries = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    is_private = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location', 
            'cover_photo', 'galleries', 'created_by', 'is_private', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_is_private(self, obj):
        return obj.privacy != 'public'
        
    def get_cover_photo(self, obj):
        # Get the primary cover or first available cover
        cover = obj.covers.filter(is_primary=True).first() or obj.covers.first()
        if cover and cover.image:
            request = self.context.get('request')
            if request is not None and hasattr(request, 'build_absolute_uri'):
                return request.build_absolute_uri(cover.image.url)
            return cover.image.url
        return None
        
    def get_galleries(self, obj):
        # Use the prefetched galleries_data if available, otherwise query them with annotations
        galleries = getattr(obj, 'galleries_data', None) or Gallery.objects.filter(
            event=obj,
            is_public=True
        ).prefetch_related(
            'photos__likes',  # Prefetch likes for N+1 optimization
            'photos__likes__user'  # Prefetch users who liked for N+1 optimization
        )
        
        # Get the current user from the request context
        request = self.context.get('request')
        
        # Manually build the gallery data with like information
        gallery_data = []
        for gallery in galleries:
            # Get photos with like counts
            photos_data = []
            for photo in gallery.photos.filter(is_public=True):
                photos_data.append({
                    'id': photo.id,
                    'title': photo.title,
                    'description': photo.description,
                    'image': request.build_absolute_uri(photo.image.url) if request and hasattr(request, 'build_absolute_uri') else photo.image.url,
                    'width': photo.width,
                    'height': photo.height,
                    'created_at': photo.created_at,
                    'like_count': photo.likes.count(),
                    'is_liked': photo.likes.filter(user=request.user).exists() if request and request.user.is_authenticated else False
                })
            
            # Add gallery data with photos
            gallery_data.append({
                'id': gallery.id,
                'title': gallery.title,
                'description': gallery.description,
                'photos': photos_data,
                'created_at': gallery.created_at,
                'updated_at': gallery.updated_at
            })
            
        return gallery_data


class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public event listing (shows all events but marks private ones).
    
    For private events, includes a flag indicating if the current user has verified access.
    """
    created_by = serializers.SerializerMethodField()
    is_private = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location',
            'privacy', 'is_private', 'is_verified', 'created_by', 
            'created_at', 'updated_at', 'cover_image', 'requires_pin'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'cover_image', 'is_verified']
        
    def get_is_verified(self, obj):
        """Check if the current user has verified access to this private event."""
        if obj.privacy != 'private':
            return None
            
        # Get verified events from context (set in the view)
        verified_events = self.context.get('request').session.get('verified_events', [])
        return str(obj.id) in verified_events
    
    def get_created_by(self, obj):
        # Return a simplified user object or None if not available
        if not obj.created_by:
            return None
        return {
            'id': obj.created_by.id,
            'email': obj.created_by.email,
            'first_name': obj.created_by.first_name,
            'last_name': obj.created_by.last_name
        }
    
    def get_is_private(self, obj):
        return obj.privacy == 'private'
        
    def get_cover_image(self, obj):
        # Get the first cover image for the event
        cover = obj.covers.first()
        if cover and cover.image:
            request = self.context.get('request')
            if request is not None and hasattr(request, 'build_absolute_uri'):
                return request.build_absolute_uri(cover.image.url)
            # Return relative URL if request is not available
            return cover.image.url
        return None

class EventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing events."""
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Event
        fields = ['id', 'name', 'date', 'created_by']
        read_only_fields = ['id', 'name', 'date', 'created_by']


class EventSerializer(serializers.ModelSerializer):
    """Serializer for the Event model with full access."""
    created_by = UserSerializer(read_only=True)
    galleries = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location',
            'privacy', 'pin', 'created_by', 'created_at', 'updated_at', 'galleries'
        ]
        read_only_fields = ['id', 'slug', 'created_by', 'created_at', 'updated_at', 'galleries']
        extra_kwargs = {
            'pin': {'write_only': True, 'required': False}  # Make pin optional and write-only
        }
    
    def get_galleries(self, obj):
        """Get galleries for this event."""
        request = self.context.get('request')
        galleries = obj.galleries.all()
        
        # Filter by visibility if not the owner
        if not (request and request.user == obj.created_by):
            galleries = galleries.filter(is_public=True)
            
        return GalleryListSerializer(galleries, many=True, context=self.context).data
    
    def to_representation(self, instance):
        """Customize the response data."""
        data = super().to_representation(instance)
        # Only include PIN if the user is the creator or a superuser
        request = self.context.get('request')
        if request and (request.user == instance.created_by or request.user.is_superuser):
            data['pin'] = instance.pin
        return data


class PhotoSerializer(serializers.ModelSerializer):
    """Serializer for the Photo model."""
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Photo
        fields = [
            'id', 'title', 'description', 'image', 'image_url', 'thumbnail_url',
            'width', 'height', 'file_size', 'mime_type', 'is_featured',
            'is_public', 'order', 'created_at', 'updated_at', 'uploaded_by'
        ]
        read_only_fields = [
            'id', 'width', 'height', 'file_size', 'mime_type',
            'created_at', 'updated_at', 'image_url', 'thumbnail_url', 'uploaded_by'
        ]
    
    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.image:
            # In a production environment, you'd generate a thumbnail URL here
            # For now, we'll return the original image URL
            return obj.image.url
        return None

class GalleryListSerializer(serializers.ModelSerializer):
    """Serializer for listing galleries with basic information."""
    cover_photo = serializers.SerializerMethodField()
    photographer = UserSerializer(read_only=True)
    total_photos = serializers.IntegerField(read_only=True, source='photo_count')
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'slug', 'description', 'photographer',
            'cover_photo', 'total_photos', 'is_public', 'price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'total_photos']
    
    def get_cover_photo(self, obj):
        if obj.cover_photo and obj.cover_photo.image:
            return obj.cover_photo.image.url
        return None

class GalleryDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed gallery view including photos and event."""
    photos = serializers.SerializerMethodField()
    event = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    photographer = UserSerializer(read_only=True)
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'slug', 'description', 'photos', 
            'event', 'photographer', 'cover_photo', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_photos(self, obj):
        # Get public photos for the gallery with like counts
        # Using 'total_likes' as the annotation name to avoid conflict with the model's like_count field
        photos = obj.photos.filter(is_public=True).annotate(
            total_likes=Count('likes', distinct=True)
        )
        
        # Get the current user from the request context
        request = self.context.get('request')
        
        # Create a list to store photo data with like status
        photo_data = []
        
        for photo in photos:
            photo_dict = {
                'id': photo.id,
                'title': photo.title,
                'description': photo.description,
                'image': request.build_absolute_uri(photo.image.url) if request and hasattr(request, 'build_absolute_uri') else photo.image.url,
                'width': photo.width,
                'height': photo.height,
                'created_at': photo.created_at,
                'like_count': photo.total_likes if hasattr(photo, 'total_likes') else photo.likes.count(),
                'is_liked': photo.likes.filter(user=request.user).exists() if request and request.user.is_authenticated else False
            }
            photo_data.append(photo_dict)
            
        return photo_data
    
    def get_event(self, obj):
        if not obj.event:
            return None
        return {
            'id': obj.event.id,
            'name': obj.event.name,
            'slug': obj.event.slug,
            'date': obj.event.date
        }
        
    def get_cover_photo(self, obj):
        # Get the cover photo or first photo in the gallery
        cover = obj.cover_photo or obj.photos.filter(is_public=True).first()
        if cover and cover.image:
            request = self.context.get('request')
            if request is not None and hasattr(request, 'build_absolute_uri'):
                return request.build_absolute_uri(cover.image.url)
            return cover.image.url
        return None

class GalleryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating galleries with photos."""
    photos = serializers.ListField(
        child=serializers.ImageField(
            max_length=100000, 
            allow_empty_file=False, 
            use_url=False
        ),
        write_only=True,
        required=True
    )
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        required=True,
        help_text="Event ID this gallery belongs to"
    )
    cover_photo_index = serializers.IntegerField(
        required=False,
        allow_null=True,
        write_only=True,
        help_text="Index of the photo to use as cover (0-based)"
    )
    
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'is_public', 'price', 'event', 'photos', 'cover_photo_index']
        read_only_fields = ['photographer']
    
    def create(self, validated_data):
        from .utils import process_image
        import logging
        
        # Get logger instance
        logger = logging.getLogger(__name__)
        
        # Extract photos, event, and cover_photo_index from validated data
        photos_data = validated_data.pop('photos', [])
        event = validated_data.pop('event', None)
        cover_photo_index = validated_data.pop('cover_photo_index', 0)  # Default to 0 if not provided
        
        # Ensure is_public is True by default if not provided
        if 'is_public' not in validated_data:
            validated_data['is_public'] = True
            
        # Set the photographer to the current user
        validated_data['photographer'] = self.context['request'].user
        
        try:
            # Create the gallery
            gallery = super().create(validated_data)
            
            # Set the event after creation to avoid M2M issues
            if event:
                gallery.event = event
                gallery.save()
            
            # Create and process each photo
            processed_photos = []
            
            for index, photo_data in enumerate(photos_data):
                try:
                    # Create the photo
                    photo = Photo.objects.create(
                        gallery=gallery,
                        image=photo_data,
                        uploaded_by=self.context['request'].user
                    )
                    
                    # Process the image (add watermark, optimize, etc.)
                    process_image(photo)
                    photo.save()
                    
                    # Add to our list of processed photos
                    processed_photos.append(photo)
                    
                except Exception as e:
                    # If image processing fails, log the error but continue with other photos
                    logger.error(f"Error processing image {getattr(photo_data, 'name', 'unknown')}: {str(e)}")
            
            # Now set the cover photo based on the cover_photo_index
            if processed_photos:
                try:
                    # Ensure the index is within bounds
                    valid_index = min(max(0, int(cover_photo_index or 0)), len(processed_photos) - 1)
                    cover_photo = processed_photos[valid_index]
                    
                    # Set the cover_photo to the Photo instance, not the image field
                    gallery.cover_photo = cover_photo
                    gallery.save()
                    
                    logger.info(f"Set cover photo for gallery {gallery.id} to photo ID {cover_photo.id} (index: {valid_index})")
                except Exception as e:
                    logger.error(f"Error setting cover photo for gallery {gallery.id}: {str(e)}")
                    # Fallback to first photo if there's an error
                    if processed_photos:
                        gallery.cover_photo = processed_photos[0]
                        gallery.save()
            
            return gallery
            
        except Exception as e:
            logger.error(f"Error in GalleryCreateSerializer.create: {str(e)}")
            raise


class GalleryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating galleries."""
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'is_public', 'price']
    
    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
        return super().create(validated_data)

class DownloadSerializer(serializers.ModelSerializer):
    """Serializer for photo downloads."""
    class Meta:
        model = Download
        fields = ['id', 'photo', 'downloaded_at', 'ip_address']
        read_only_fields = ['id', 'downloaded_at', 'ip_address']
    
    def create(self, validated_data):
        # Set the user to the current user
        validated_data['user'] = self.context['request'].user
        # Set the IP address from the request
        request = self.context.get('request')
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            validated_data['ip_address'] = ip
        return super().create(validated_data)
