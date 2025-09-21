from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from ..models.activity import UserActivity

class UserActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for user activities
    """
    activity_type_display = serializers.CharField(
        source='get_activity_type_display',
        read_only=True
    )
    
    # Related object information
    content_object = serializers.SerializerMethodField()
    content_type_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserActivity
        fields = [
            'id',
            'activity_type',
            'activity_type_display',
            'content_type',
            'content_type_name',
            'object_id',
            'content_object',
            'metadata',
            'created_at',
            'user'  # Include user ID for verification
        ]
        read_only_fields = ['created_at', 'user']
    
    def get_content_object(self, obj):
        """
        Get the related object's basic information
        """
        if not obj.content_object:
            return None
            
        content_object = obj.content_object
        data = {
            'id': str(content_object.id) if hasattr(content_object, 'id') else None,
            'title': getattr(content_object, 'title', None) or str(content_object),
            'url': None
        }
        
        # Add URL if available
        if hasattr(content_object, 'get_absolute_url'):
            request = self.context.get('request')
            if request is not None:
                data['url'] = request.build_absolute_uri(content_object.get_absolute_url())
        
        # Add thumbnail URL for photos
        if hasattr(content_object, 'thumbnail') and content_object.thumbnail:
            data['thumbnail_url'] = content_object.thumbnail.url
        
        return data
    
    def get_content_type_name(self, obj):
        """
        Get the content type name (e.g., 'photo', 'gallery')
        """
        if not obj.content_type:
            return None
        return obj.content_type.model
    
    def to_representation(self, instance):
        """
        Customize the serialized output
        """
        data = super().to_representation(instance)
        
        # Include user info if not already included
        if 'user' not in data and hasattr(instance, 'user'):
            data['user'] = {
                'id': instance.user.id,
                'username': instance.user.username,
                'email': instance.user.email
            }
        
        return data
