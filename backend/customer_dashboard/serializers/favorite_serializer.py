from rest_framework import serializers
from ..models import Favorite

class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for the Favorite model
    """
    photo_title = serializers.CharField(source='photo.title', read_only=True)
    photo_thumbnail = serializers.SerializerMethodField()
    gallery_title = serializers.CharField(source='photo.gallery.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Favorite
        fields = [
            'id',
            'photo',
            'photo_title',
            'photo_thumbnail',
            'gallery_title',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'created_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
        }
    
    def get_photo_thumbnail(self, obj):
        """
        Get the photo thumbnail URL
        """
        request = self.context.get('request')
        if obj.photo and obj.photo.thumbnail:
            return request.build_absolute_uri(obj.photo.thumbnail.url) if request else obj.photo.thumbnail.url
        return None
