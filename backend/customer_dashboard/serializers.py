from rest_framework import serializers
from django.contrib.auth import get_user_model
from gallery.models import Photo  # Import the Photo model
from gallery.serializers import PhotoSerializer  # Assuming you have a PhotoSerializer
from .models import CustomerProfile, Purchase, Favorite, Order, OrderItem

User = get_user_model()

class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerProfile
        fields = ['email', 'full_name', 'total_purchases', 'total_spent', 'created_at']
        read_only_fields = ['total_purchases', 'total_spent', 'created_at']
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class PurchaseSerializer(serializers.ModelSerializer):
    photo = PhotoSerializer(read_only=True)
    photo_id = serializers.PrimaryKeyRelatedField(
        queryset=Photo.objects.all(),
        source='photo',
        write_only=True
    )
    
    class Meta:
        model = Purchase
        fields = ['id', 'photo', 'photo_id', 'amount', 'purchase_date', 'download_count', 'download_limit', 'is_active']
        read_only_fields = ['id', 'purchase_date', 'download_count', 'is_active']

class FavoriteSerializer(serializers.ModelSerializer):
    photo = PhotoSerializer(read_only=True)
    photo_id = serializers.PrimaryKeyRelatedField(
        queryset=Photo.objects.all(),
        source='photo',
        write_only=True
    )
    
    class Meta:
        model = Favorite
        fields = ['id', 'photo', 'photo_id', 'created_at']
        read_only_fields = ['id', 'created_at']

class OrderItemSerializer(serializers.ModelSerializer):
    photo = PhotoSerializer(read_only=True)
    photo_id = serializers.PrimaryKeyRelatedField(
        queryset=Photo.objects.all(),
        source='photo',
        write_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'photo', 'photo_id', 'quantity', 'price', 'subtotal', 'created_at']
        read_only_fields = ['id', 'subtotal', 'created_at']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'order_number', 'customer', 'customer_email', 'total_amount', 'status', 
                 'created_at', 'updated_at', 'items']
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'customer']
    
    def create(self, validated_data):
        # This will be implemented in the view
        pass
