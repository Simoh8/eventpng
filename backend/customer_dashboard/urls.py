from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'profile', api_views.CustomerProfileViewSet, basename='customer-profile')
router.register(r'purchases', api_views.PurchaseViewSet, basename='purchase')
router.register(r'favorites', api_views.FavoriteViewSet, basename='favorite')
router.register(r'orders', api_views.OrderViewSet, basename='order')

# Additional URL patterns
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', api_views.DashboardViewSet.as_view({'get': 'list'}), name='customer-dashboard'),
]
