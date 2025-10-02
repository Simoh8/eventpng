from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *  # This will import all views including the ones from base_views and cached_views
from .views_photo import ProtectedImageView
from .views.ticket_views import (
    EventWithTicketsViewSet,
    TicketViewSet,
    PublicTicketViewSet,
    TicketPurchaseViewSet,
    AvailableTicketsViewSet,
    register_tickets
)

app_name = 'gallery'

urlpatterns = [
    # Gallery endpoints
    path('galleries/', GalleryListView.as_view(), name='gallery-list'),
    path('galleries/create/', GalleryCreateView.as_view(), name='gallery-create'),
    path('galleries/<int:pk>/', GalleryDetailView.as_view(), name='gallery-detail'),
    
    # Photo endpoints - using UUID for photo_id
    path('galleries/<int:gallery_id>/photos/', PhotoListView.as_view(), name='photo-list'),
    path('galleries/<int:gallery_id>/photos/<uuid:photo_id>/', PhotoDetailView.as_view(), name='photo-detail'),
    path('photos/<uuid:photo_id>/download/', DownloadPhotoView.as_view(), name='download-photo'),
    path('photos/<uuid:photo_id>/protected/', ProtectedImageView.as_view(), name='protected-photo'),
    
    # Public endpoints (no authentication required)
    path('public/galleries/', PublicGalleryListView.as_view(), name='public-gallery-list'),
    path('public/galleries/by-id/<int:pk>/', PublicGalleryDetailByIdView.as_view(), name='public-gallery-detail-by-id'),
    path('public/galleries/<slug:slug>/', PublicGalleryDetailView.as_view(), name='public-gallery-detail'),
    path('public/galleries/<int:pk>/', redirect_id_to_slug, name='public-gallery-id-redirect'),
    path('public/galleries/<int:gallery_id>/photos/', PublicPhotoListView.as_view(), name='public-gallery-photos'),
    path('public/photos/<int:pk>/', PublicPhotoDetailView.as_view(), name='public-photo-detail'),
    
    # Stats endpoints
    path('stats/', StatsView.as_view(), name='platform-stats'),
    path('cached/homepage/', HomepageView.as_view(), name='cached-homepage'),
    path('cached/stats/', GalleryStatsView.as_view(), name='cached-stats'),
    
    # Event endpoints
    path('events/', EventListView.as_view(), name='event-list'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('public/events/', PublicEventListView.as_view(), name='public-event-list'),
    path('public/events/<int:pk>/', PublicEventDetailView.as_view(), name='public-event-detail'),
    path('public/events/slug/<slug:slug>/', PublicEventBySlugView.as_view(), name='public-event-detail-by-slug'),
    path('events/<slug:slug>/verify-pin/', VerifyEventPinView.as_view(), name='verify-event-pin'),
    
    # Ticket endpoints
    path('events/with-tickets/', EventWithTicketsViewSet.as_view({'get': 'list'}), name='events-with-tickets'),
    path('tickets/available/', AvailableTicketsViewSet.as_view({'get': 'list'}), name='available-tickets'),
    path('events/<int:event_pk>/tickets/', TicketViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='event-tickets-list'),
    path('events/<int:event_pk>/tickets/<int:pk>/', TicketViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='event-ticket-detail'),
    path('events/<int:event_pk>/tickets/<int:pk>/available/', TicketViewSet.as_view({
        'get': 'available'
    }), name='event-ticket-available'),
    
    # Public ticket endpoints
    path('public/events/<int:event_pk>/tickets/', PublicTicketViewSet.as_view({
        'get': 'list'
    }), name='public-event-tickets'),
    
    # Ticket registration endpoints
    path('tickets/register/', register_tickets, name='ticket-register'),
    path('tickets/purchase/', TicketPurchaseViewSet.as_view({
        'post': 'create'
    }), name='ticket-purchase'),
    path('tickets/my-tickets/', TicketPurchaseViewSet.as_view({
        'get': 'list'
    }), name='my-tickets'),
    path('tickets/<int:pk>/cancel/', TicketPurchaseViewSet.as_view({
        'post': 'cancel'
    }), name='cancel-ticket'),
    
    # Event stats endpoint
    path('events/<int:event_id>/stats/', event_stats, name='event-stats'),
    
    # Like endpoints - using UUID for photo_id
    path('photos/<uuid:photo_id>/like/', LikePhotoView.as_view(), name='like-photo'),
    path('photos/<uuid:photo_id>/unlike/', UnlikePhotoView.as_view(), name='unlike-photo'),
    path('user/liked-photos/', UserLikedPhotosView.as_view(), name='user-liked-photos'),
    
    # Recent galleries endpoint
    path('recent-galleries/', RecentGalleriesView.as_view(), name='recent-galleries'),
    
    # Ongoing galleries endpoint
    path('ongoing-galleries/', OngoingGalleriesView.as_view(), name='ongoing-galleries'),
]
