# This makes the views directory a Python package
# Import all views here to make them available as gallery.views.ViewName
from .cached_views import HomepageView, GalleryStatsView
from .base_views import (
    StatsView, LikePhotoView, UnlikePhotoView, UserLikedPhotosView,
    RecentGalleriesView, OngoingGalleriesView, GalleryListView,
    GalleryCreateView, GalleryDetailView, PhotoListView, PhotoDetailView,
    DownloadPhotoView, PublicGalleryListView, PublicGalleryDetailByIdView,
    PublicGalleryDetailView, PublicPhotoDetailView, PublicPhotoListView,
    EventListView, EventDetailView, PublicEventListView, PublicEventDetailView,
    PublicEventBySlugView, VerifyEventPinView, redirect_id_to_slug, event_stats, 
    public_event_detail_page
)
