from rest_framework import serializers
from ..models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the OrderItem model
    """
    photo_title = serializers.CharField(source='photo.title', read_only=True)
    photo_thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'photo',
            'photo_title',
            'photo_thumbnail',
            'quantity',
            'price',
            'total_price',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'total_price']
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
    
    def get_total_price(self, obj):
        """
        Calculate the total price for the order item
        """
        return obj.quantity * obj.price


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Order model
    """
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'status',
            'status_display',
            'subtotal',
            'tax_amount',
            'shipping_cost',
            'total_amount',
            'payment_method',
            'payment_status',
            'transaction_id',
            'shipping_address',
            'shipping_city',
            'shipping_state',
            'shipping_country',
            'shipping_postal_code',
            'items',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'created_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
            'updated_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
        }
    
    def to_representation(self, instance):
        """
        Customize the response format
        """
        representation = super().to_representation(instance)
        
        # Add item count
        representation['item_count'] = instance.items.count()
        
        return representation
