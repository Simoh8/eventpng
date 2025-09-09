from rest_framework import serializers
from .models import Event, Gallery, Photo, Download
from accounts.serializers import UserSerializer

class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public event listing (shows all events but marks private ones)."""
    created_by = UserSerializer(read_only=True)
    is_private = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location',
            'privacy', 'is_private', 'created_by', 'created_at', 'updated_at',
            'cover_image'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'cover_image']
    
    def get_is_private(self, obj):
        return obj.privacy == 'private'
        
    def get_cover_image(self, obj):
        # Get the first cover image for the event
        cover = obj.covers.first()
        if cover and cover.image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(cover.image.url)
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
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location',
            'privacy', 'pin', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'pin': {'write_only': True, 'required': False}  # Make pin optional and write-only
        }
    
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
    photo_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'slug', 'description', 'photographer',
            'cover_photo', 'photo_count', 'is_public', 'price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'photo_count']
    
    def get_cover_photo(self, obj):
        if obj.cover_photo and obj.cover_photo.image:
            return obj.cover_photo.image.url
        return None

class GalleryDetailSerializer(GalleryListSerializer):
    """Serializer for detailed gallery view including photos."""
    photos = PhotoSerializer(many=True, read_only=True)
    
    class Meta(GalleryListSerializer.Meta):
        fields = GalleryListSerializer.Meta.fields + ['photos']

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
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'is_public', 'price', 'event', 'photos']
        read_only_fields = ['photographer']
    
    def create(self, validated_data):
        from .utils import process_image
        
        # Extract photos from validated data
        photos_data = validated_data.pop('photos', [])
        
        # Create gallery with the current user as the photographer
        gallery = Gallery.objects.create(
            photographer=self.context['request'].user,
            **validated_data
        )
        
        # Create and process each photo
        for photo_data in photos_data:
            photo = Photo.objects.create(
                gallery=gallery,
                image=photo_data,
                uploaded_by=self.context['request'].user
            )
            
            # Process the image (add watermark, optimize, etc.)
            try:
                process_image(photo)
                photo.save()
            except Exception as e:
                # If image processing fails, log the error but don't fail the entire request
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error processing image {photo_data.name}: {str(e)}")
        
        return gallery


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
