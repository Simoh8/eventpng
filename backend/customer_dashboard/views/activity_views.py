from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Q

from ..models.activity import UserActivity
from ..serializers.activity_serializer import UserActivitySerializer

class ActivityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for user activities
    """
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ActivityPagination
    
    def get_queryset(self):
        """
        Return activities for the current user
        """
        queryset = UserActivity.objects.filter(user=self.request.user)
        
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
