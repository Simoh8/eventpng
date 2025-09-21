from rest_framework import serializers
from ..models import Purchase

class PurchaseSerializer(serializers.ModelSerializer):
    """
    Serializer for the Purchase model
    """
    photo_title = serializers.CharField(source='photo.title', read_only=True)
    photo_thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = [
            'id',
            'photo',
            'photo_title',
            'photo_thumbnail',
            'amount',
            'purchase_date',
            'transaction_id',
            'payment_method',
            'is_active',
            'is_refunded',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'purchase_date': {'format': '%Y-%m-%dT%H:%M:%S%z'},
            'created_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
            'updated_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
        }
    
    def get_photo_thumbnail(self, obj):
        """
        Get the photo thumbnail URL
        """
        request = self.context.get('request')
        if obj.photo and obj.photo.thumbnail:
            return request.build_absolute_uri(obj.photo.thumbnail.url) if request else obj.photo.thumbnail.url
        return None
