from rest_framework import serializers
from .models import Event, Gallery, Photo, Download
from accounts.serializers import UserSerializer

class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public event listing (shows all events but marks private ones)."""
    created_by = UserSerializer(read_only=True)
    is_private = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'date', 'location',
            'privacy', 'is_private', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_is_private(self, obj):
        return obj.privacy == 'private'

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
            'pin': {'write_only': True}  # Don't expose PIN in list views
        }
    
    def to_representation(self, instance):
        """Customize the response data."""
        data = super().to_representation(instance)
        # Only include PIN if the user is the creator or a superuser
        request = self.context.get('request')
        if request and (request.user == instance.created_by or request.user.is_superuser):
            data['pin'] = instance.pin
        else:
            data.pop('pin', None)
        return data


class PhotoSerializer(serializers.ModelSerializer):
    """Serializer for the Photo model."""
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Photo
        fields = [
            'id', 'title', 'description', 'image', 'image_url', 'thumbnail_url',
            'width', 'height', 'file_size', 'mime_type', 'is_featured',
            'is_public', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'width', 'height', 'file_size', 'mime_type',
            'created_at', 'updated_at', 'image_url', 'thumbnail_url'
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

class GalleryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating galleries."""
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'is_public', 'price']
    
    def create(self, validated_data):
        # Set the photographer to the current user
        validated_data['photographer'] = self.context['request'].user
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
