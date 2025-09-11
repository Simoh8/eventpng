from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_photo import ProtectedImageView
from .views import StatsView, RecentGalleriesView, event_stats

app_name = 'gallery'

urlpatterns = [
    # Gallery endpoints
    path('galleries/', views.GalleryListView.as_view(), name='gallery-list'),
    path('galleries/create/', views.GalleryCreateView.as_view(), name='gallery-create'),
    path('galleries/<int:pk>/', views.GalleryDetailView.as_view(), name='gallery-detail'),
    
    # Photo endpoints
    path('galleries/<int:gallery_id>/photos/', views.PhotoListView.as_view(), name='photo-list'),
    path('galleries/<int:gallery_id>/photos/<int:photo_id>/', views.PhotoDetailView.as_view(), name='photo-detail'),
    path('photos/<int:photo_id>/download/', views.DownloadPhotoView.as_view(), name='download-photo'),
    path('photos/<int:photo_id>/protected/', ProtectedImageView.as_view(), name='protected-photo'),
    
    # Public endpoints (no authentication required)
    path('public/galleries/', views.PublicGalleryListView.as_view(), name='public-gallery-list'),
    path('public/galleries/<slug:slug>/', views.PublicGalleryDetailView.as_view(), name='public-gallery-detail-slug'),
    path('public/galleries/<int:pk>/', views.PublicGalleryDetailView.as_view(), name='public-gallery-detail'),
    path('public/galleries/<int:gallery_id>/photos/', views.PublicPhotoListView.as_view(), name='public-gallery-photos'),
    path('public/photos/<int:pk>/', views.PublicPhotoDetailView.as_view(), name='public-photo-detail'),
    
    # Stats endpoint
    path('stats/', views.StatsView.as_view(), name='platform-stats'),
    
    # Event endpoints
    path('events/', views.EventListView.as_view(), name='event-list'),
    path('events/<int:pk>/', views.EventDetailView.as_view(), name='event-detail'),
    path('public/events/', views.PublicEventListView.as_view(), name='public-event-list'),
    path('events/<slug:slug>/verify-pin/', views.VerifyEventPinView.as_view(), name='verify-event-pin'),
    
    # Event stats endpoint
    path('public/events/<int:event_id>/stats/', views.event_stats, name='event-stats'),
    
    # Direct endpoints (for backward compatibility)
    path('', include([
        path('stats/', StatsView.as_view(), name='direct-stats'),
        path('recent/', RecentGalleriesView.as_view(), name='recent-galleries'),
    ])),
]
