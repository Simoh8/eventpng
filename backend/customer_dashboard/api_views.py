from rest_framework import viewsets, status, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from .models import CustomerProfile, Purchase, Favorite, Order, OrderItem, UserActivity
from .serializers import (
    CustomerProfileSerializer, 
    PurchaseSerializer, 
    FavoriteSerializer,
    OrderSerializer,
    OrderItemSerializer,
    DownloadSerializer,
    UserActivitySerializer
)
from gallery.models import Photo, Download as GalleryDownload
from .utils.activity_logger import log_user_activity

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
        return Purchase.objects.filter(customer=self.request.user, is_active=True).order_by('-purchase_date')
    
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
        return Favorite.objects.filter(user=self.request.user).select_related('photo', 'photo__gallery').order_by('-created_at')
    
    def perform_create(self, serializer):
        try:
            favorite = serializer.save(user=self.request.user)
            # Log the favorite activity
            if hasattr(favorite, 'photo') and favorite.photo:
                log_user_activity(
                    user=self.request.user,
                    activity_type=UserActivity.ActivityType.FAVORITE_ADD,
                    obj=favorite.photo,
                    metadata={
                        'photo_id': str(favorite.photo.id),
                        'photo_title': getattr(favorite.photo, 'title', 'Untitled'),
                        'gallery_id': str(favorite.photo.gallery_id) if hasattr(favorite.photo, 'gallery_id') and favorite.photo.gallery_id else None,
                        'gallery_title': favorite.photo.gallery.title if hasattr(favorite.photo, 'gallery') and favorite.photo.gallery else None
                    }
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in perform_create: {str(e)}", exc_info=True)
            raise
    
    def perform_destroy(self, instance):
        try:
            # Get photo data before deletion
            photo_data = {}
            if hasattr(instance, 'photo') and instance.photo:
                photo_data = {
                    'photo_id': str(instance.photo.id),
                    'photo_title': getattr(instance.photo, 'title', 'Untitled'),
                    'gallery_id': str(instance.photo.gallery_id) if hasattr(instance.photo, 'gallery_id') and instance.photo.gallery_id else None,
                    'gallery_title': instance.photo.gallery.title if hasattr(instance.photo, 'gallery') and instance.photo.gallery else None
                }
            
            # Delete the instance
            instance.delete()
            
            # Log the unfavorite activity after successful deletion
            log_user_activity(
                user=self.request.user,
                activity_type=UserActivity.ActivityType.FAVORITE_REMOVE,
                obj=instance.photo if hasattr(instance, 'photo') else None,
                metadata=photo_data
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in perform_destroy: {str(e)}", exc_info=True)
            raise
    
    @action(detail=False, methods=['post'])
    def remove(self, request):
        """Remove a photo from favorites"""
        photo_id = request.data.get('photo_id')
        if not photo_id:
            return Response(
                {"detail": "photo_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            favorite = Favorite.objects.get(
                user=request.user, 
                photo_id=photo_id
            )
            # The activity will be logged in perform_destroy
            favorite.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Favorite.DoesNotExist:
            return Response(
                {"detail": "Favorite not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer orders
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).order_by('-created_at')
    
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

class DownloadViewSet(mixins.ListModelMixin, 
                     mixins.RetrieveModelMixin, 
                     GenericViewSet):
    """
    API endpoint for customer downloads
    """
    serializer_class = DownloadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Get all downloads for the current user, ordered by most recent
        from gallery.models import Download
        return Download.objects.filter(user=self.request.user)\
            .select_related('photo', 'photo__gallery')\
            .order_by('-downloaded_at')
    
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply pagination if needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class DashboardViewSet(viewsets.ViewSet):
    """
    API endpoint for customer dashboard data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request):
        user = request.user
        
        # Get customer profile
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        
        # Get purchase stats
        purchases = Purchase.objects.filter(customer=user, is_active=True)
        total_spent = purchases.aggregate(total=Sum('amount'))['total'] or 0
        
        # Get favorite stats
        favorites_count = Favorite.objects.filter(user=user).count()
        
        # Get order stats
        orders = Order.objects.filter(customer=user)
        total_orders = orders.count()
        
        # Get download stats - using the correct Download model from gallery app
        from gallery.models import Download
        downloads = Download.objects.filter(user=user)
        total_downloads = downloads.count()
        
        # Get recent purchases, favorites, downloads, and orders
        recent_purchases = PurchaseSerializer(
            purchases.order_by('-purchase_date')[:3], 
            many=True,
            context={'request': request}
        ).data if purchases.exists() else []
        
        recent_favorites = FavoriteSerializer(
            Favorite.objects.filter(user=user).select_related('photo', 'photo__gallery')
                .order_by('-created_at')[:3],
            many=True,
            context={'request': request}
        ).data if Favorite.objects.filter(user=user).exists() else []
        
        recent_orders = OrderSerializer(
            orders.order_by('-created_at')[:3],
            many=True,
            context={'request': request}
        ).data if orders.exists() else []
        
        # Get recent downloads with photo and gallery info
        recent_downloads = DownloadSerializer(
            downloads.select_related('photo', 'photo__gallery')
                .order_by('-downloaded_at')[:4],
            many=True,
            context={'request': request}
        ).data if downloads.exists() else []
        
        # Get recent activities with photo data
        from django.contrib.contenttypes.models import ContentType
        
        # Get content type for Photo model
        photo_content_type = ContentType.objects.get_for_model(Photo)
        
        # Get recent activities with photo data
        recent_activities = (
            UserActivity.objects
            .filter(
                user=user,
                content_type=photo_content_type,
                object_id__isnull=False
            )
            .select_related('user', 'content_type')
            .order_by('-created_at')[:10]
        )
        
        # Get all photo objects efficiently
        photo_ids = [act.object_id for act in recent_activities if act.object_id]
        photos = Photo.objects.in_bulk(photo_ids, field_name='id')
        
        # Prepare activity data with photo information
        recent_activities_data = []
        for act in recent_activities:
            photo = photos.get(act.object_id) if act.object_id else None
            
            # Get photo data if available
            photo_data = None
            if photo:
                photo_data = {
                    'id': str(photo.id),
                    'title': photo.title,
                    'thumbnail_url': photo.thumbnail.url if hasattr(photo, 'thumbnail') and photo.thumbnail else None,
                }
            
            activity_data = {
                'id': str(act.id),
                'activity_type': act.activity_type,
                'activity_type_display': act.get_activity_type_display(),
                'created_at': act.created_at,
                'metadata': act.metadata,
                'photo': photo_data
            }
            recent_activities_data.append(activity_data)
        
        # Prepare the response data to match frontend expectations
        return Response({
            # Profile information
            'user': {
                'id': user.id,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'avatar': None,  # Add if you have avatar field
            },
            # Stats data - match frontend's expected format
            'totalDownloads': total_downloads,
            'purchasedPhotos': purchases.count(),
            'favoritesCount': favorites_count,
            'ordersCount': total_orders,
            'totalSpent': float(total_spent),
            
            # Recent items - using the exact field names from frontend
            'recent_purchases': recent_purchases,
            'recent_favorites': recent_favorites,
            'recent_orders': recent_orders,
            'recent_downloads': recent_downloads,
            'recent_activities': recent_activities_data,
            'downloads_count': total_downloads,  # Frontend might be looking for this
            
            # Stats in the format the frontend might be expecting
            'stats': {
                'total_downloads': total_downloads,
                'purchased_photos': purchases.count(),
                'favorites_count': favorites_count,
                'total_orders': total_orders,
                'total_spent': float(total_spent),
            }
        })


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for user activities
    """
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return activities for the current user with optimized queries
        """
        # Prefetch related data to avoid N+1 queries
        queryset = UserActivity.objects.filter(user=self.request.user)
        
        # Prefetch content object based on content type
        from django.contrib.contenttypes.models import ContentType
        from gallery.models import Photo, Gallery
        
        # Get all content types we might need
        photo_type = ContentType.objects.get_for_model(Photo)
        gallery_type = ContentType.objects.get_for_model(Gallery)
        
        # Create a prefetch for each content type
        from django.db.models import Prefetch
        
        # Prefetch photos
        queryset = queryset.prefetch_related(
            'user',  # Prefetch the user
            Prefetch('content_type', queryset=ContentType.objects.filter(id__in=[photo_type.id, gallery_type.id])),
        )
        
        # Filter by activity type if provided
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
            
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        # Order by most recent first
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent activities (last 10)
        """
        activities = self.get_queryset()[:10]
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get activity statistics
        """
        from django.db.models import Count
        
        # Get activity counts by type
        activity_stats = UserActivity.objects.filter(
            user=request.user
        ).values('activity_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Get recent activity dates
        recent_activity = UserActivity.objects.filter(
            user=request.user
        ).values('created_at__date').annotate(
            count=Count('id')
        ).order_by('-created_at__date')[:30]  # Last 30 days
        
        return Response({
            'activity_type_stats': list(activity_stats),
            'recent_activity': list(recent_activity),
            'total_activities': sum(item['count'] for item in activity_stats)
        })