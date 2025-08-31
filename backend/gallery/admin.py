from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from .models import Gallery, Photo, Download

class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1
    fields = ('preview', 'image', 'title', 'is_public', 'is_featured', 'order', 'created_at')
    readonly_fields = ('preview', 'created_at')
    show_change_link = True
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 60px; max-width: 80px; object-fit: cover; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_photo_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'photographer', 'is_public', 'photo_count', 'price_formatted', 'created_short', 'gallery_actions')
    list_filter = ('is_public', 'is_active', 'created_at', 'photographer')
    search_fields = ('title', 'description', 'photographer__email', 'photographer__full_name')
    list_select_related = ('photographer', 'cover_photo')
    readonly_fields = ('created_at', 'updated_at', 'cover_preview', 'gallery_actions')
    list_per_page = 20
    date_hierarchy = 'created_at'
    save_on_top = True
    
    fieldsets = (
        (_('Gallery Info'), {
            'fields': (
                'title', 
                'slug', 
                'description', 
                'photographer', 
                'price',
                'cover_photo',
                'cover_preview'
            )
        }),
        (_('Visibility & Status'), {
            'fields': (
                'is_public', 
                'is_active',
                'featured_until'
            ),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': (
                'created_at', 
                'updated_at',
                'gallery_actions'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PhotoInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('photos')
    
    def photo_count(self, obj):
        return obj.photos.count()
    photo_count.short_description = 'Photos'
    
    def price_formatted(self, obj):
        if obj.price is None:
            return "Free"
        return f"${obj.price:.2f}"
    price_formatted.short_description = 'Price'
    price_formatted.admin_order_field = 'price'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def cover_preview(self, obj):
        if obj.cover_photo and obj.cover_photo.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 200px; max-width: 100%; object-fit: contain; border: 1px solid #eee; padding: 5px; background: #f8f8f8;" />'
                '</a>',
                obj.cover_photo.image.url,
                reverse('admin:gallery_photo_change', args=[obj.cover_photo.id])
            )
        return "No cover photo selected"
    cover_preview.short_description = 'Cover Preview'
    
    def gallery_actions(self, obj):
        return format_html(
            '<div class="submit-row">'
            '<a href="{}" class="button" target="_blank">View on site</a> '
            '<a href="{}" class="button" style="background: #4CAF50;" target="_blank">Add Photos</a>'
            '</div>',
            reverse('gallery-detail', args=[obj.slug]),
            '{}?gallery={}'.format(reverse('admin:gallery_photo_add'), obj.id)
        )
    gallery_actions.short_description = 'Actions'
    gallery_actions.allow_tags = True


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('admin_thumbnail', 'title', 'gallery_link', 'is_public', 'is_featured', 'created_short', 'photo_actions')
    list_display_links = ('admin_thumbnail', 'title')
    list_filter = ('is_public', 'is_featured', 'created_at', 'gallery')
    search_fields = ('title', 'description', 'gallery__title', 'gallery__photographer__email')
    list_select_related = ('gallery', 'gallery__photographer')
    readonly_fields = ('preview', 'dimensions', 'file_size_mb', 'created_at', 'updated_at', 'photo_actions')
    list_per_page = 20
    date_hierarchy = 'created_at'
    save_on_top = True
    
    fieldsets = (
        (_('Photo Details'), {
            'fields': (
                'title',
                'description',
                'gallery',
            )
        }),
        (_('Image'), {
            'fields': (
                'image',
                'preview',
                'dimensions',
                'file_size_mb',
                'mime_type'
            )
        }),
        (_('Settings'), {
            'fields': (
                'is_public',
                'is_featured',
                'order',
                'tags'
            ),
            'classes': ('collapse',)
        }),
        (_('Actions'), {
            'fields': ('photo_actions',),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('gallery__photographer')
    
    def admin_thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return "(No image)"
    admin_thumbnail.short_description = 'Thumbnail'
    admin_thumbnail.allow_tags = True
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Uploaded'
    created_short.admin_order_field = 'created_at'
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<div style="max-width: 100%; overflow: hidden; margin: 10px 0;">'
                '<img src="{}" style="max-height: 500px; max-width: 100%; display: block; margin: 0 auto; border: 1px solid #eee; padding: 5px; background: #f8f8f8;" />'
                '</div>',
                obj.image.url
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def dimensions(self, obj):
        if hasattr(obj.image, 'width') and hasattr(obj.image, 'height'):
            return f"{obj.image.width} × {obj.image.height} px"
        return "N/A"
    dimensions.short_description = 'Dimensions'
    
    def file_size_mb(self, obj):
        if obj.image and hasattr(obj.image, 'size'):
            size_kb = obj.image.size / 1024
            if size_kb < 1024:
                return f"{size_kb:.1f} KB"
            return f"{size_kb / 1024:.2f} MB"
        return "N/A"
    file_size_mb.short_description = 'File Size'
    
    def photo_actions(self, obj):
        if not obj.id:
            return ""
        return format_html(
            '<div class="submit-row">'
            '<a href="{}" class="button" target="_blank" style="margin-right: 5px;">View on site</a>'
            '<a href="{}" class="button" style="background: #4CAF50; margin-right: 5px;">Edit in Gallery</a>'
            '</div>',
            reverse('photo-detail', args=[obj.id]),
            '{}?gallery={}'.format(reverse('admin:gallery_gallery_change', args=[obj.gallery.id]), obj.gallery.id)
        )
    photo_actions.short_description = 'Actions'
    photo_actions.allow_tags = True


@admin.register(Download)
class DownloadAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'photo_thumbnail', 'photo_title', 'gallery_link', 'downloaded_short', 'ip_address')
    list_filter = ('downloaded_at', 'photo__gallery')
    search_fields = ('user__email', 'user__full_name', 'photo__title', 'photo__gallery__title', 'ip_address')
    list_select_related = ('user', 'photo', 'photo__gallery')
    readonly_fields = ('downloaded_at', 'ip_address', 'user_agent', 'user_link', 'photo_link', 'gallery_link')
    date_hierarchy = 'downloaded_at'
    list_per_page = 25
    
    fieldsets = (
        (_('Download Details'), {
            'fields': (
                'user_link',
                'photo_link',
                'gallery_link',
                'downloaded_at',
            )
        }),
        (_('Request Information'), {
            'fields': (
                'ip_address',
                'user_agent',
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'photo', 'photo__gallery'
        )
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:accounts_customuser_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "-"
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def photo_thumbnail(self, obj):
        if obj.photo and obj.photo.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />',
                obj.photo.image.url
            )
        return "-"
    photo_thumbnail.short_description = 'Photo'
    photo_thumbnail.allow_tags = True
    
    def photo_title(self, obj):
        if obj.photo:
            url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.title)
        return "-"
    photo_title.short_description = 'Title'
    photo_title.admin_order_field = 'photo__title'
    
    def gallery_link(self, obj):
        if obj.photo and obj.photo.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.photo.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'photo__gallery__title'
    
    def downloaded_short(self, obj):
        return obj.downloaded_at.strftime('%b %d, %Y %H:%M')
    downloaded_short.short_description = 'Downloaded'
    downloaded_short.admin_order_field = 'downloaded_at'
    
    def photo_link(self, obj):
        if obj.photo:
            url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.title)
        return "-"
    photo_link.short_description = 'Photo'
