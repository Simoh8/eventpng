from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import CustomerProfile, Purchase, Favorite, Order, OrderItem
from .serializers import (
    CustomerProfileSerializer, 
    PurchaseSerializer, 
    FavoriteSerializer,
    OrderSerializer,
    OrderItemSerializer
)
from gallery.models import Photo

User = get_user_model()

class CustomerProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer profile
    """
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']
    
    def get_queryset(self):
        return CustomerProfile.objects.filter(user=self.request.user)
    
    def get_object(self):
        obj, created = CustomerProfile.objects.get_or_create(user=self.request.user)
        return obj

class PurchaseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer purchases
    """
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Purchase.objects.filter(customer=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
        
        # Update customer's purchase stats
        profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
        profile.total_purchases = self.get_queryset().count()
        profile.total_spent = self.get_queryset().aggregate(total=Sum('amount'))['total'] or 0
        profile.save()

class FavoriteViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer favorites
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        photo = serializer.validated_data['photo']
        if Favorite.objects.filter(user=self.request.user, photo=photo).exists():
            raise serializers.ValidationError("This photo is already in your favorites.")
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['delete'])
    def remove(self, request):
        """Remove a photo from favorites"""
        photo_id = request.query_params.get('photo_id')
        if not photo_id:
            return Response("photo_id is required", status=status.HTTP_400_BAD_REQUEST)
        
        favorite = get_object_or_404(
            Favorite, 
            user=request.user,
            photo_id=photo_id
        )
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer orders
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # This is a simplified order creation. In a real app, you'd want to:
        # 1. Validate cart/checkout data
        # 2. Process payment
        # 3. Create order and order items
        # 4. Update inventory
        # 5. Send confirmation email
        
        # For now, we'll just create a basic order
        order_data = {
            'customer': request.user,
            'order_number': f"ORD-{timezone.now().strftime('%Y%m%d%H%M%S')}-{request.user.id}",
            'total_amount': request.data.get('total_amount', 0),
            'status': 'completed'  # In a real app, this would depend on payment status
        }
        
        order = Order.objects.create(**order_data)
        
        # Add order items
        items_data = request.data.get('items', [])
        for item_data in items_data:
            OrderItem.objects.create(
                order=order,
                photo_id=item_data.get('photo_id'),
                quantity=item_data.get('quantity', 1),
                price=item_data.get('price', 0)
            )
        
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class DashboardViewSet(viewsets.ViewSet):
    """
    API endpoint for customer dashboard data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        user = request.user
        
        # Get or create customer profile
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        
        # Get recent purchases
        recent_purchases = Purchase.objects.filter(
            customer=user, 
            is_active=True
        ).select_related('photo').order_by('-purchase_date')[:5]
        
        # Get recent favorites
        recent_favorites = Favorite.objects.filter(
            user=user
        ).select_related('photo').order_by('-created_at')[:5]
        
        # Get recent orders
        recent_orders = Order.objects.filter(
            customer=user
        ).prefetch_related('order_items').order_by('-created_at')[:5]
        
        # Get stats
        stats = {
            'total_photos': Purchase.objects.filter(customer=user, is_active=True).count(),
            'total_favorites': recent_favorites.count(),
            'total_orders': recent_orders.count(),
            'total_spent': float(profile.total_spent or 0)
        }
        
        # Serialize data
        purchase_serializer = PurchaseSerializer(recent_purchases, many=True)
        favorite_serializer = FavoriteSerializer(recent_favorites, many=True)
        order_serializer = OrderSerializer(recent_orders, many=True)
        
        return Response({
            'profile': CustomerProfileSerializer(profile).data,
            'stats': stats,
            'recent_purchases': purchase_serializer.data,
            'recent_favorites': favorite_serializer.data,
            'recent_orders': order_serializer.data
        })
