from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from django.urls import reverse
from django.utils.html import format_html, mark_safe
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Count, F, Q, Sum
from django.conf import settings

from .models import Event, EventCoverImage, Gallery, Photo, Download

# Get the custom user model if it exists
User = get_user_model()
HAS_CUSTOM_USER_ADMIN = hasattr(User, 'is_photographer')

# Admin site instance
admin_site = admin.site

class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1
    fields = ('image', 'thumbnail_preview', 'title', 'description', 'price', 'is_featured')
    readonly_fields = ('thumbnail_preview',)
    
    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 60px; border-radius: 4px;" />', obj.image.url)
        return "No image"
    thumbnail_preview.short_description = 'Preview'

class EventCoverImageInline(admin.TabularInline):
    model = EventCoverImage
    extra = 1
    fields = ('image', 'preview', 'caption', 'is_primary', 'order')
    readonly_fields = ('preview',)
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 80px; max-width: 120px; border-radius: 4px; object-fit: cover; border: 1px solid #eee;" />'
                '</a>',
                obj.image.url,
                obj.image.url
            )
        return "No image"
    preview.short_description = 'Preview'
    preview.allow_tags = True

@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_link', 'photo_count', 'photographer_link', 'created_at_short', 'is_public_display', 'gallery_actions')
    list_filter = ('created_at', 'event__date')
    search_fields = ('title', 'description', 'event__name', 'photographer__email', 'photographer__full_name')
    list_select_related = ('event', 'photographer')
    readonly_fields = ('created_at', 'updated_at', 'photo_count', 'photographer_link', 'event_link')
    list_per_page = 25
    date_hierarchy = 'created_at'
    save_on_top = True
    inlines = [PhotoInline]
    actions = ['make_public', 'make_private']
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            photo_count=Count('photos', distinct=True)
        )
        
    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        try:
            search_term_as_int = int(search_term)
            queryset |= self.model.objects.filter(id=search_term_as_int)
        except ValueError:
            pass
        return queryset, use_distinct
    
    def created_at_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_at_short.short_description = 'Created'
    created_at_short.admin_order_field = 'created_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            photo_count=Count('photos')
        )
    
    def photo_count(self, obj):
        url = reverse('admin:gallery_photo_changelist') + f'?gallery__id={obj.id}'
        return format_html('<a href="{}">{}</a>', url, obj.photo_count)
    photo_count.short_description = 'Photos'
    photo_count.admin_order_field = 'photo_count'
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.event.name)
        return "-"
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def photographer_link(self, obj):
        if obj.photographer:
            url = reverse('admin:accounts_customuser_change', args=[obj.photographer.id])
            return format_html('<a href="{}">{}</a>', url, obj.photographer.get_full_name() or obj.photographer.email)
        return "-"
    photographer_link.short_description = 'Photographer'
    photographer_link.admin_order_field = 'photographer__email'
    
    def gallery_actions(self, obj):
        return format_html(
            '<div class="gallery-actions">'
            '<a class="button" href="{}" style="padding: 2px 8px; background: #417690; color: white; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 5px;">View</a>'
            '<a class="button" href="{}" style="padding: 2px 8px; background: #5b80b9; color: white; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 5px;">Add Photos</a>'
            '</div>',
            reverse('admin:gallery_gallery_change', args=[obj.id]),
            f"{reverse('admin:gallery_photo_add')}?gallery={obj.id}"
        )
    gallery_actions.short_description = 'Actions'
    gallery_actions.allow_tags = True
    
    def make_public(self, request, queryset):
        if hasattr(queryset.model, 'is_public'):
            updated = queryset.update(is_public=True)
            self.message_user(request, f'Made {updated} gallery(ies) public.', messages.SUCCESS)
        else:
            self.message_user(request, 'This model does not support public/private visibility.', messages.ERROR)
    make_public.short_description = "Make selected galleries public"
    
    def make_private(self, request, queryset):
        if hasattr(queryset.model, 'is_public'):
            updated = queryset.update(is_public=False)
            self.message_user(request, f'Made {updated} gallery(ies) private.', messages.SUCCESS)
        else:
            self.message_user(request, 'This model does not support public/private visibility.', messages.ERROR)
    make_private.short_description = "Make selected galleries private"
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by if this is a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def is_public_display(self, obj):
        if hasattr(obj, 'is_public'):
            if obj.is_public:
                return format_html('<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Public</span>')
            else:
                return format_html('<span style="background: #F44336; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Private</span>')
        return ""
    is_public_display.short_description = 'Visibility'
    is_public_display.allow_tags = True

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'location', 'get_gallery_count', 'get_photo_count', 'privacy_badge', 'cover_preview', 'created_by_display', 'created_short')
    list_filter = ('privacy', 'date', 'created_at', 'created_by')
    search_fields = ('name', 'location', 'description', 'created_by__email', 'created_by__full_name')
    list_select_related = ('created_by',)
    readonly_fields = ('created_at', 'updated_at', 'pin_display', 'cover_preview', 'get_gallery_count', 'get_photo_count', 'created_by_display')
    list_per_page = 25
    date_hierarchy = 'date'
    save_on_top = True
    inlines = [EventCoverImageInline]
    actions = ['make_public', 'make_private']
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            gallery_count=Count('galleries', distinct=True),
            photo_count=Count('galleries__photos', distinct=True)
        )
        
    def get_gallery_count(self, obj):
        return obj.gallery_count
    get_gallery_count.short_description = 'Galleries'
    get_gallery_count.admin_order_field = 'gallery_count'
    
    def get_photo_count(self, obj):
        return obj.photo_count
    get_photo_count.short_description = 'Photos'
    get_photo_count.admin_order_field = 'photo_count'
    
    def privacy_badge(self, obj):
        privacy_choices = dict(Event.PRIVACY_CHOICES)
        privacy = privacy_choices.get(obj.privacy, 'Unknown')
        colors = {
            'public': 'green',
            'private': 'orange',
            'invite_only': 'blue'
        }
        color = colors.get(obj.privacy, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">{}</span>',
            color, privacy
        )
    privacy_badge.short_description = 'Privacy'
    privacy_badge.admin_order_field = 'privacy'
    
    def cover_preview(self, obj):
        cover = obj.covers.filter(is_primary=True).first() or obj.covers.first()
        if cover and cover.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 60px; border-radius: 4px;" />'
                '</a>',
                cover.image.url,
                cover.image.url
            )
        return "No cover"
    cover_preview.short_description = 'Cover'
    cover_preview.allow_tags = True
    
    def created_by_display(self, obj):
        if obj.created_by:
            url = reverse('admin:accounts_customuser_change', args=[obj.created_by.id])
            return format_html('<a href="{}">{}</a>', url, obj.created_by.email)
        return "-"
    created_by_display.short_description = 'Created By'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def pin_display(self, obj):
        return obj.pin or "-"
    pin_display.short_description = 'PIN'
    
    def make_public(self, request, queryset):
        updated = queryset.update(privacy='public')
        self.message_user(request, f'Made {updated} event(s) public.', messages.SUCCESS)
    make_public.short_description = "Make selected events public"
    
    def make_private(self, request, queryset):
        updated = queryset.update(privacy='private')
        self.message_user(request, f'Made {updated} event(s) private.', messages.SUCCESS)
    make_private.short_description = "Make selected events private"
    
    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        try:
            search_term_as_int = int(search_term)
            queryset |= self.model.objects.filter(id=search_term_as_int)
        except ValueError:
            pass
        return queryset, use_distinct
    
    def gallery_count(self, obj):
        url = reverse('admin:gallery_gallery_changelist') + f'?event__id={obj.id}'
        return format_html('<a href="{}">{}</a>', url, obj.galleries.count())
    gallery_count.short_description = 'Galleries'
    gallery_count.admin_order_field = 'gallery_count'
    
    def photo_count(self, obj):
        url = reverse('admin:gallery_photo_changelist') + f'?gallery__event__id={obj.id}'
        return format_html('<a href="{}">{}</a>', url, getattr(obj, 'photo_count', 0))
    photo_count.short_description = 'Photos'
    photo_count.admin_order_field = 'photo_count'
    
    fieldsets = (
        (_('Event Information'), {
            'fields': ('name', 'slug', 'description', 'date', 'location')
        }),
        (_('Cover Image'), {
            'fields': ('cover_preview',),
            'classes': ('collapse',)
        }),
        (_('Privacy Settings'), {
            'fields': ('privacy', 'pin_display'),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def cover_preview(self, obj):
        cover = obj.covers.filter(is_primary=True).first() or obj.covers.first()
        if cover and cover.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 60px; max-width: 80px; border-radius: 4px; object-fit: cover;" />'
                '</a>',
                cover.image.url,
                cover.image.url
            )
        return "No cover"
    cover_preview.short_description = 'Cover'
    cover_preview.allow_tags = True
    
    def privacy_badge(self, obj):
        privacy_styles = {
            'public': ('#4CAF50', 'Public'),
            'private': ('#f44336', 'Private'),
            'invite_only': ('#FF9800', 'Invite Only'),
        }
        bg_color, display_text = privacy_styles.get(obj.privacy, ('#9E9E9E', obj.get_privacy_display()))
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">{}</span>',
            bg_color, display_text
        )
    privacy_badge.short_description = 'Privacy'
    privacy_badge.admin_order_field = 'privacy'
    
    def pin_display(self, obj):
        return obj.pin if obj.privacy == 'private' else "—"
    pin_display.short_description = 'Access PIN'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 60px; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                obj.image.url
            )
        return "No image"
    thumbnail_preview.short_description = 'Preview'
    thumbnail_preview.allow_tags = True
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def event_link(self, obj):
        if obj.gallery and obj.gallery.event:
            url = reverse('admin:gallery_event_change', args=[obj.gallery.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.event.name)
        return "-"
    event_link.short_description = 'Event'
    
    def get_featured_badge(self, obj):
        if obj.is_featured:
            return format_html(
                '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Featured</span>'
            )
        return ""
    get_featured_badge.short_description = 'Featured'
    get_featured_badge.allow_tags = True
    
    def get_status_badge(self, obj):
        status_colors = {
            'draft': 'gray',
            'published': 'green',
            'archived': 'orange',
        }
        color = status_colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    get_status_badge.short_description = 'Status'
    get_status_badge.allow_tags = True
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def get_image_preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-width: 100%; max-height: 400px; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                obj.image.url
            )
        return "No image"
    get_image_preview.short_description = 'Image Preview'
    get_image_preview.allow_tags = True
    
    def make_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'Marked {updated} photo(s) as featured.', messages.SUCCESS)
    make_featured.short_description = "Mark selected photos as featured"
    
    def remove_featured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'Removed featured status from {updated} photo(s).', messages.SUCCESS)
    remove_featured.short_description = "Remove featured status"
    
    def publish_photos(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f'Published {updated} photo(s).', messages.SUCCESS)
    publish_photos.short_description = "Publish selected photos"
    
    def unpublish_photos(self, request, queryset):
        updated = queryset.update(status='draft')
        self.message_user(request, f'Unpublished {updated} photo(s).', messages.SUCCESS)
    unpublish_photos.short_description = "Unpublish selected photos"
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(EventCoverImage)
class EventCoverImageAdmin(admin.ModelAdmin):
    list_display = ('preview', 'event_link', 'get_dimensions', 'get_file_size', 'get_primary_badge', 'order', 'created_short')
    list_filter = ('is_primary', 'created_at', 'event')
    search_fields = ('caption', 'event__name', 'event__location')
    list_editable = ('order',)
    list_display_links = ('preview', 'event_link')
    readonly_fields = ('created_at', 'updated_at', 'preview', 'get_dimensions', 'get_file_size', 'get_primary_badge')
    list_per_page = 20
    actions = ['make_primary', 'duplicate_cover']
    
    fieldsets = (
        (None, {
            'fields': ('event', 'image', 'preview', 'get_dimensions', 'get_file_size', 'caption', 'is_primary', 'order')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 60px; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                obj.image.url
            )
        return "No image"
    preview.short_description = 'Preview'
    preview.allow_tags = True
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.event.name)
        return "-"
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def get_dimensions(self, obj):
        if obj.image and hasattr(obj.image, 'width') and hasattr(obj.image, 'height'):
            return f"{obj.image.width} × {obj.image.height}"
        return "N/A"
    get_dimensions.short_description = 'Dimensions'
    
    def get_file_size(self, obj):
        if obj.image and hasattr(obj.image, 'size'):
            return f"{obj.image.size / 1024:.1f} KB"
        return "N/A"
    get_file_size.short_description = 'File Size'
    
    def get_primary_badge(self, obj):
        if obj.is_primary:
            return format_html(
                '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Primary</span>'
            )
        return ""
    get_primary_badge.short_description = 'Primary'
    get_primary_badge.allow_tags = True
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def make_primary(self, request, queryset):
        # Only allow one primary image per event
        from django.db import transaction
        
        with transaction.atomic():
            # First, get all events that have selected images
            event_ids = queryset.values_list('event_id', flat=True).distinct()
            
            # Set all selected images as primary
            updated = queryset.update(is_primary=True)
            
            # For each affected event, unset primary on other images
            for event_id in event_ids:
                self.model.objects.filter(
                    event_id=event_id,
                    is_primary=True
                ).exclude(
                    id__in=queryset.filter(event_id=event_id).values('id')
                ).update(is_primary=False)
        
        self.message_user(
            request,
            f"Successfully set {updated} image(s) as primary. Other images for these events have been unset as primary.",
            messages.SUCCESS
        )
    make_primary.short_description = "Make selected images primary"
    
    def duplicate_cover(self, request, queryset):
        from django.core.files.base import ContentFile
        import os
        
        count = 0
        for cover in queryset:
            try:
                # Create a copy of the image file
                image_file = cover.image
                new_image = ContentFile(image_file.read(), name=os.path.basename(image_file.name))
                
                # Create a new cover with the same data
                new_cover = self.model(
                    event=cover.event,
                    caption=f"{cover.caption} (Copy)" if cover.caption else "",
                    is_primary=False,  # Don't duplicate primary status
                    order=cover.order
                )
                new_cover.image.save(os.path.basename(image_file.name), new_image, save=False)
                new_cover.save()
                count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Failed to duplicate cover {cover.id}: {str(e)}",
                    level=messages.ERROR
                )
        
        self.message_user(
            request,
            f"Successfully duplicated {count} cover image(s).",
            messages.SUCCESS
        )
    duplicate_cover.short_description = "Duplicate selected cover images"

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('thumbnail_preview', 'title', 'gallery_link', 'is_featured_display', 'status_display', 'created_at_short')
    list_filter = ('is_featured', 'created_at', 'gallery__event')
    search_fields = ('title', 'description', 'gallery__title', 'gallery__event__name', 'tags__name')
    list_select_related = ('gallery', 'gallery__event')
    readonly_fields = ('created_at', 'updated_at', 'thumbnail_preview', 'gallery_link', 'get_image_preview')
    list_per_page = 30
    date_hierarchy = 'created_at'
    save_on_top = True
    actions = ['make_featured', 'remove_featured', 'publish_photos', 'unpublish_photos']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('gallery', 'gallery__event')
    
    def is_featured_display(self, obj):
        if obj.is_featured:
            return format_html(
                '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Featured</span>'
            )
        return ""
    is_featured_display.short_description = 'Featured'
    is_featured_display.allow_tags = True
    
    def status_display(self, obj):
        status = 'published' if obj.is_public else 'private'
        status_colors = {
            'published': 'green',
            'private': 'gray',
        }
        color = status_colors.get(status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; text-transform: capitalize;">{}</span>',
            color, status
        )
    status_display.short_description = 'Status'
    status_display.allow_tags = True
    
    def created_at_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_at_short.short_description = 'Created'
    created_at_short.admin_order_field = 'created_at'
    
    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 60px; border-radius: 4px;" />', obj.image.url)
        return "No image"
    thumbnail_preview.short_description = 'Preview'
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def get_image_preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-width: 100%; max-height: 400px; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                obj.image.url
            )
        return "No image"
    get_image_preview.short_description = 'Image Preview'
    get_image_preview.allow_tags = True
    
    def make_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'Marked {updated} photo(s) as featured.', messages.SUCCESS)
    make_featured.short_description = "Mark selected photos as featured"
    
    def remove_featured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'Removed featured status from {updated} photo(s).', messages.SUCCESS)
    remove_featured.short_description = "Remove featured status"
    
    def publish_photos(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f'Published {updated} photo(s).', messages.SUCCESS)
    publish_photos.short_description = "Publish selected photos"
    
    def unpublish_photos(self, request, queryset):
        updated = queryset.update(status='draft')
        self.message_user(request, f'Unpublished {updated} photo(s).', messages.SUCCESS)
    unpublish_photos.short_description = "Unpublish selected photos"
    
    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        try:
            search_term_as_int = int(search_term)
            queryset |= self.model.objects.filter(id=search_term_as_int)
        except ValueError:
            pass
        return queryset, use_distinct
        
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'gallery' in form.base_fields:
            form.base_fields['gallery'].queryset = Gallery.objects.all().select_related('event')
        return form
    
    def created_at_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_at_short.short_description = 'Created'
    created_at_short.admin_order_field = 'created_at'
    
    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 60px; border-radius: 4px;" />', obj.image.url)
        return "No image"
    thumbnail_preview.short_description = 'Preview'
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def status_badge(self, obj):
        status_colors = {
            'draft': 'gray',
            'published': 'green',
            'hidden': 'orange',
        }
        color = status_colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

@admin.register(Download)
class DownloadAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_link', 'photo_preview', 'gallery_link', 'file_size_mb', 'downloaded_at_short', 'download_actions')
    list_filter = ('downloaded_at', 'photo__gallery__event')
    search_fields = ('user__email', 'user__full_name', 'photo__title', 'gallery__title', 'photo__gallery__event__name')
    readonly_fields = ('downloaded_at', 'user_link', 'photo_preview', 'gallery_link', 'file_size_mb', 'download_actions')
    list_per_page = 30
    date_hierarchy = 'downloaded_at'
    actions = ['resend_download_links', 'export_downloads_csv']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'photo', 'gallery', 'photo__gallery__event')
        
    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        try:
            search_term_as_int = int(search_term)
            queryset |= self.model.objects.filter(id=search_term_as_int)
        except ValueError:
            pass
        return queryset, use_distinct
        
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:accounts_customuser_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "-"
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        elif obj.photo and obj.photo.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.photo.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def photo_preview(self, obj):
        if obj.photo and obj.photo.image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 50px; max-width: 70px; border-radius: 4px; object-fit: cover;" />'
                '</a>',
                obj.photo.image.url,
                obj.photo.image.url
            )
        return "No photo"
    photo_preview.short_description = 'Photo'
    photo_preview.allow_tags = True
    
    def file_size_mb(self, obj):
        if obj.photo and obj.photo.image:
            try:
                size = obj.photo.image.size
                return f"{size / (1024 * 1024):.2f} MB"
            except (ValueError, OSError):
                return "N/A"
        return "N/A"
    file_size_mb.short_description = 'File Size'
    file_size_mb.admin_order_field = 'photo__image_size'
    
    def downloaded_at_short(self, obj):
        if obj.downloaded_at:
            return obj.downloaded_at.strftime('%b %d, %Y %H:%M')
        return "-"
    downloaded_at_short.short_description = 'Downloaded'
    downloaded_at_short.admin_order_field = 'downloaded_at'
    
    def download_actions(self, obj):
        buttons = []
        if obj.photo and obj.photo.image:
            buttons.append(
                f'<a class="button" href="{reverse("admin:gallery_photo_change", args=[obj.photo.id])}" '
                'style="padding: 2px 8px; background: #417690; color: white; border-radius: 4px; '
                'text-decoration: none; font-size: 12px; margin-right: 5px;">View Photo</a>'
            )
        if obj.gallery:
            buttons.append(
                f'<a class="button" href="{reverse("admin:gallery_gallery_change", args=[obj.gallery.id])}" '
                'style="padding: 2px 8px; background: #5b80b9; color: white; border-radius: 4px; '
                'text-decoration: none; font-size: 12px; margin-right: 5px;">View Gallery</a>'
            )
        return format_html(' '.join(buttons)) if buttons else "-"
    download_actions.short_description = 'Actions'
    download_actions.allow_tags = True
    
    def resend_download_links(self, request, queryset):
        from django.core.mail import send_mail
        from django.conf import settings
        
        count = 0
        for download in queryset:
            if download.user and download.user.email:
                try:
                    subject = f"Your Download: {download.photo.title if download.photo else 'Gallery'}"
                    message = f"Here's your download link: {settings.SITE_URL}/downloads/{download.id}/"
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [download.user.email],
                        fail_silently=False,
                    )
                    count += 1
                except Exception as e:
                    self.message_user(
                        request,
                        f"Failed to send email to {download.user.email}: {str(e)}",
                        level=messages.ERROR
                    )
        self.message_user(
            request,
            f"Successfully sent {count} download link(s).",
            level=messages.SUCCESS
        )
    resend_download_links.short_description = "Resend download links"
    
    def export_downloads_csv(self, request, queryset):
        import csv
        from django.http import HttpResponse
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            'ID', 'User Email', 'Photo Title', 'Gallery Title', 'Event', 
            'File Size (MB)', 'Downloaded At'
        ])
        
        # Write data rows
        for download in queryset.select_related('user', 'photo', 'gallery', 'photo__gallery__event'):
            writer.writerow([
                download.id,
                download.user.email if download.user else '',
                download.photo.title if download.photo else '',
                download.gallery.title if download.gallery else (
                    download.photo.gallery.title if (download.photo and download.photo.gallery) else ''
                ),
                download.photo.gallery.event.name if (
                    download.photo and download.photo.gallery and download.photo.gallery.event
                ) else '',
                f"{download.photo.image.size / (1024 * 1024):.2f}" if (
                    download.photo and download.photo.image and hasattr(download.photo.image, 'size')
                ) else 'N/A',
                download.downloaded_at.strftime('%Y-%m-%d %H:%M:%S') if download.downloaded_at else ''
            ])
        
        # Prepare response
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=downloads_export.csv'
        return response
    export_downloads_csv.short_description = "Export selected downloads to CSV"

# Register models with the admin site
# Note: Models are now registered using the @admin.register decorator
# This function is kept for backward compatibility but does nothing
def register_models():
    pass
