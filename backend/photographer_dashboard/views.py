from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import timedelta, datetime
from gallery.models import Gallery, Photo, Payment, Download
from accounts.models import CustomUser
from django.conf import settings
import os

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get email from query parameters or use authenticated user
        user_email = request.query_params.get('email')
        print(f"Received request from email: {user_email}")
        print(f"Authenticated user: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
        
        if user_email:
            try:
                user = CustomUser.objects.get(email=user_email)
                print(f"Found user by email: {user.email}, ID: {user.id}")
            except CustomUser.DoesNotExist:
                print(f"User with email {user_email} not found")
                return Response(
                    {'error': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            user = request.user
            print(f"Using authenticated user: {user.email if user.is_authenticated else 'No authenticated user'}")
        
        # Generate a cache key based on the user
        cache_key = f'dashboard_stats_{user.id}'
        print(f"Using cache key: {cache_key}")
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            print("Cache hit - returning cached data")
            return Response(cached_data)
        print("Cache miss - generating new data")
        
        # Calculate time ranges
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        
        # Get galleries data for the specified user
        galleries = Gallery.objects.filter(photographer=user)
        recent_galleries = galleries.filter(created_at__gte=thirty_days_ago)
        
        print(f"Found {galleries.count()} total galleries for user {user.email}")
        print(f"Found {recent_galleries.count()} recent galleries for user {user.email}")
        
        # Get payments data
        payments = Payment.objects.filter(
            status='completed',
            downloads__photo__gallery__photographer=user
        ).distinct()
        
        print(f"Found {payments.count()} completed payments for user {user.email}")
        
        # Calculate storage used
        photos = Photo.objects.filter(gallery__photographer=user)
        total_storage = photos.aggregate(total=Sum('file_size'))['total'] or 0
        
        print(f"Found {photos.count()} photos for user {user.email}")
        print(f"Total storage used: {total_storage} bytes")
        
        # Calculate storage used in last 30 days
        recent_photos = photos.filter(created_at__gte=thirty_days_ago)
        recent_storage = recent_photos.aggregate(total=Sum('file_size'))['total'] or 0
        
        # Calculate previous period for comparison
        prev_period_start = now - timedelta(days=60)
        prev_period_photos = photos.filter(
            created_at__gte=prev_period_start,
            created_at__lt=thirty_days_ago
        )
        prev_storage = prev_period_photos.aggregate(total=Sum('file_size'))['total'] or 0
        storage_change = ((recent_storage - prev_storage) / (prev_storage or 1)) * 100
        
        # Prepare stats
        stats = {
            'galleries': {
                'total': galleries.count(),
                'recent': recent_galleries.count(),
            },
            'activeSessions': {
                'total': galleries.filter(is_active=True).count(),
                'recent': recent_galleries.filter(is_active=True).count(),
            },
            'earnings': {
                'total': float(payments.aggregate(total=Sum('amount'))['total'] or 0),
                'recent': float(payments.filter(created_at__gte=seven_days_ago).aggregate(total=Sum('amount'))['total'] or 0),
            },
            'storageUsed': {
                'used': round(total_storage / (1024 ** 3), 2),  # Convert to GB
                'change': round(storage_change, 1),  # Percentage change
            },
            'timestamp': now.isoformat(),
        }
        
        # Cache the data for 5 minutes
        cache.set(cache_key, stats, timeout=300)
        
        return Response(stats)


class DashboardActivityView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get email from query parameters or use authenticated user
        user_email = request.query_params.get('email')
        print(f"[Activity] Received request from email: {user_email}")
        print(f"[Activity] Authenticated user: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
        
        if user_email:
            try:
                user = CustomUser.objects.get(email=user_email)
                print(f"[Activity] Found user by email: {user.email}, ID: {user.id}")
            except CustomUser.DoesNotExist:
                print(f"[Activity] User with email {user_email} not found")
                return Response(
                    {'error': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            user = request.user
            print(f"[Activity] Using authenticated user: {user.email if user.is_authenticated else 'No authenticated user'}")
        
        # Generate a cache key based on the user
        cache_key = f'dashboard_activity_{user.id}'
        print(f"[Activity] Using cache key: {cache_key}")
        
        # Try to get data from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            print("[Activity] Cache hit - returning cached data")
            return Response(cached_data)
        print("[Activity] Cache miss - generating new data")
        
        activities = []
        now = timezone.now()
        
        # Get recent gallery activities
        recent_galleries = Gallery.objects.filter(
            photographer=user,
            created_at__gte=now - timedelta(days=30)
        ).order_by('-created_at')[:5]
        
        print(f"[Activity] Found {recent_galleries.count()} recent galleries for user {user.email}")
        
        for gallery in recent_galleries:
            activities.append({
                'id': f'gallery_{gallery.id}',
                'action': 'Created new gallery',
                'target': gallery.title,
                'timestamp': gallery.created_at.isoformat(),
                'type': 'gallery_created'
            })
        
        # Get recent photo uploads
        recent_photos = Photo.objects.filter(
            gallery__photographer=request.user,
            created_at__gte=now - timedelta(days=30)
        ).select_related('gallery').order_by('-created_at')[:5]
        
        for photo in recent_photos:
            activities.append({
                'id': f'photo_{photo.id}',
                'action': 'Uploaded photo to',
                'target': photo.gallery.title,
                'timestamp': photo.created_at.isoformat(),
                'type': 'photo_uploaded'
            })
        
        # Get recent payments
        recent_payments = Payment.objects.filter(
            status='completed',
            downloads__photo__gallery__photographer=request.user,
            created_at__gte=now - timedelta(days=30)
        ).select_related('user').prefetch_related('downloads__photo__gallery').order_by('-created_at').distinct()[:5]
        
        for payment in recent_payments:
            # Get all unique galleries from the payment's downloads
            galleries = set()
            for download in payment.downloads.all():
                if hasattr(download, 'photo') and hasattr(download.photo, 'gallery'):
                    galleries.add(download.photo.gallery.title)
            
            if galleries:
                target = ', '.join(galleries)
                activities.append({
                    'id': f'payment_{payment.id}',
                    'action': 'Received payment for',
                    'target': target,
                    'amount': float(payment.amount),
                    'timestamp': payment.created_at.isoformat(),
                    'type': 'payment_received'
                })
        
        # Sort all activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Keep only the 10 most recent activities
        activities = activities[:10]
        
        # Cache the data for 5 minutes
        cache.set(cache_key, activities, timeout=300)
        
        return Response(activities)
