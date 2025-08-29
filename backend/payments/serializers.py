from rest_framework import serializers
from django.conf import settings
from .models import Order, OrderItem, Transaction, DownloadToken
from gallery.serializers import PhotoSerializer
from gallery.models import Photo

class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items."""
    photo = PhotoSerializer(read_only=True)
    photo_id = serializers.PrimaryKeyRelatedField(
        queryset=Photo.objects.all(),
        source='photo',
        write_only=True
    )
    
    class Meta:
        model = OrderItem
        fields = ['id', 'photo', 'photo_id', 'price']
        read_only_fields = ['id', 'price']

class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders."""
    items = OrderItemSerializer(many=True, required=False)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'status', 'status_display', 'subtotal', 'tax_amount', 'total',
            'currency', 'stripe_payment_intent_id', 'billing_email', 'billing_name',
            'billing_address', 'created_at', 'updated_at', 'paid_at', 'items'
        ]
        read_only_fields = [
            'id', 'status', 'subtotal', 'tax_amount', 'total', 'stripe_payment_intent_id',
            'created_at', 'updated_at', 'paid_at'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        
        # Calculate subtotal
        subtotal = sum(item['photo'].price for item in items_data if item['photo'].price is not None)
        
        # In a real app, you'd calculate tax based on the billing address
        tax_amount = subtotal * 0.1  # Example: 10% tax
        
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = subtotal + tax_amount
        order.save()
        
        # Create order items
        for item_data in items_data:
            OrderItem.objects.create(
                order=order,
                photo=item_data['photo'],
                price=item_data['photo'].price or 0
            )
        
        return order

class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions."""
    class Meta:
        model = Transaction
        fields = [
            'id', 'order', 'transaction_type', 'amount', 'currency', 'status',
            'stripe_payment_intent_id', 'stripe_charge_id', 'stripe_refund_id',
            'description', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'stripe_charge_id', 'stripe_refund_id'
        ]

class DownloadTokenSerializer(serializers.ModelSerializer):
    """Serializer for download tokens."""
    photo = PhotoSerializer(read_only=True)
    
    class Meta:
        model = DownloadToken
        fields = ['token', 'photo', 'expires_at', 'is_used', 'used_at']
        read_only_fields = ['token', 'expires_at', 'is_used', 'used_at']

class CreateCheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating a Stripe checkout session."""
    photo_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=50
    )
    success_url = serializers.URLField(required=True)
    cancel_url = serializers.URLField(required=True)
    
    def validate_photo_ids(self, value):
        # Check if all photos exist and are available for purchase
        photos = Photo.objects.filter(id__in=value, is_public=True)
        if len(photos) != len(value):
            raise serializers.ValidationError("One or more photos are not available for purchase.")
        return value

class WebhookSerializer(serializers.Serializer):
    """Serializer for handling Stripe webhook events."""
    id = serializers.CharField()
    type = serializers.CharField()
    data = serializers.DictField()
    
    def validate(self, attrs):
        # In a real app, you'd verify the webhook signature here
        # to ensure the request came from Stripe
        return attrs
