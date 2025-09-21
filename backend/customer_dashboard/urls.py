from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'profile', api_views.CustomerProfileViewSet, basename='customer-profile')
router.register(r'purchases', api_views.PurchaseViewSet, basename='purchase')
router.register(r'favorites', api_views.FavoriteViewSet, basename='favorite')
router.register(r'orders', api_views.OrderViewSet, basename='order')
router.register(r'downloads', api_views.DownloadViewSet, basename='download')
router.register(r'activities', api_views.UserActivityViewSet, basename='activity')

# Additional URL patterns
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', api_views.DashboardViewSet.as_view({'get': 'list'}), name='customer-dashboard'),
    
    # Download endpoints
    path('downloads/', api_views.DownloadViewSet.as_view({'get': 'list'}), name='download-list'),
    path('downloads/<uuid:pk>/', api_views.DownloadViewSet.as_view({'get': 'retrieve'}), name='download-detail'),
    
    # Activity endpoints
    path('activities/recent/', api_views.UserActivityViewSet.as_view({'get': 'recent'}), name='recent-activities'),
    path('activities/stats/', api_views.UserActivityViewSet.as_view({'get': 'stats'}), name='activity-stats'),
]
