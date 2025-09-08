from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.contrib.admin import AdminSite, TabularInline
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.admin import GroupAdmin
from django.contrib.sites.models import Site
from django.contrib.sites.admin import SiteAdmin

from .models import Gallery, Photo, Download, Event, EventCoverImage

# Get the custom user model
User = get_user_model()

# Import the custom user admin after getting the user model
try:
    from accounts.admin import CustomUserAdmin
    HAS_CUSTOM_USER_ADMIN = True
except (ImportError, RuntimeError):
    HAS_CUSTOM_USER_ADMIN = False

# Custom Admin Site
class CustomAdminSite(AdminSite):
    site_header = 'EventPhoto Admin'
    site_title = 'EventPhoto Administration'
    index_title = 'Welcome to EventPhoto Admin'
    
    def get_app_list(self, request, app_label=None):
        """
        Return a sorted list of all the installed apps that have been
        registered in this site.
        """
        # Get the original sorted app list
        app_dict = self._build_app_dict(request)
        
        # Sort the apps alphabetically
        app_list = sorted(app_dict.values(), key=lambda x: x['name'].lower())
        
        # Reorder apps to have Users and Groups first
        ordered_apps = []
        auth_apps = []
        other_apps = []
        
        for app in app_list:
            if app['app_label'] in ['auth', 'accounts']:
                auth_apps.append(app)
            else:
                other_apps.append(app)
                
        # Sort auth models to have Users before Groups
        for app in auth_apps:
            if 'models' in app:
                app['models'].sort(key=lambda x: x['name'].lower() != 'users')
        
        # Combine the lists with auth apps first
        ordered_apps = auth_apps + other_apps
        
        # Sort the models alphabetically within each app
        for app in ordered_apps:
            if 'models' in app:
                app['models'].sort(key=lambda x: x['name'].lower())
                
        return ordered_apps
    
    def each_context(self, request):
        context = super().each_context(request)
        context['site_header'] = self.site_header
        context['site_title'] = self.site_title
        context['site_url'] = '/'
        return context
        
    def get_urls(self):
        urls = super().get_urls()
        # Add your custom URLs here if needed
        return urls

# Create custom admin site instance
admin_site = CustomAdminSite(name='custom_admin')

# Define all admin classes first
class PhotoInline(TabularInline):
    model = Photo
    extra = 1
    fields = ('preview', 'image', 'title', 'is_public', 'is_featured', 'order', 'created_at')
    readonly_fields = ('preview', 'created_at')
    show_change_link = True
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 100px; max-width: 100px; object-fit: cover;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_photo_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'

class EventCoverImageInline(TabularInline):
    model = EventCoverImage
    extra = 1
    fields = ('image', 'caption', 'is_primary', 'order', 'preview')
    readonly_fields = ('preview',)
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 100px; max-width: 150px; object-fit: cover;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_eventcoverimage_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'

class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'location', 'privacy_badge', 'cover_preview', 'created_by', 'created_short')
    list_filter = ('privacy', 'date', 'created_at')
    search_fields = ('name', 'location', 'description', 'created_by__email')
    list_select_related = ('created_by',)
    readonly_fields = ('created_at', 'updated_at', 'pin_display', 'cover_preview')
    list_per_page = 20
    date_hierarchy = 'date'
    save_on_top = True
    inlines = [EventCoverImageInline]
    
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
        primary_cover = obj.primary_cover
        if primary_cover and primary_cover.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 200px; max-width: 300px; object-fit: contain;" />'
                '</a>',
                primary_cover.image.url,
                reverse('admin:gallery_eventcoverimage_change', args=[primary_cover.id])
            )
        return "No cover image set"
    cover_preview.short_description = 'Cover Preview'
    
    def privacy_badge(self, obj):
        if obj.privacy == 'private':
            return format_html(
                '<span class="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">Private</span>'
            )
        return format_html(
            '<span class="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">Public</span>'
        )
    privacy_badge.short_description = 'Status'
    privacy_badge.admin_order_field = 'privacy'
    
    def pin_display(self, obj):
        if obj.privacy == 'private' and obj.pin:
            return format_html(
                '<div class="flex items-center">'
                '<input type="text" value="{}" readonly class="vTextField" id="pin-field">'
                '<button type="button" class="button" onclick="copyPin()" style="margin-left: 10px;">Copy</button>'
                '</div>'
                '<script>function copyPin() {{ document.getElementById(\'pin-field\').select(); document.execCommand(\'copy\'); }} </script>',
                obj.pin
            )
        return ""
    pin_display.short_description = 'Access PIN'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:  # Only set created_by during the first save
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

class EventCoverImageAdmin(admin.ModelAdmin):
    list_display = ('preview', 'event_link', 'is_primary', 'order', 'created_short')
    list_filter = ('is_primary', 'created_at')
    search_fields = ('caption', 'event__name')
    list_editable = ('is_primary', 'order')
    list_display_links = ('preview', 'event_link')
    readonly_fields = ('created_at', 'updated_at', 'preview')
    list_per_page = 20
    
    fieldsets = (
        (None, {
            'fields': ('event', 'image', 'preview', 'caption', 'is_primary', 'order')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 200px; max-width: 300px; object-fit: contain;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_eventcoverimage_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.event.name)
        return "—"
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'

class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_link', 'photographer', 'is_public_badge', 'photo_count', 'price_formatted', 'created_short', 'gallery_actions')
    list_filter = ('is_public', 'is_active', 'created_at', 'photographer', 'event')
    search_fields = ('title', 'description', 'photographer__email', 'photographer__full_name', 'event__name')
    list_select_related = ('photographer', 'cover_photo', 'event')
    readonly_fields = ('created_at', 'updated_at', 'cover_preview', 'gallery_actions', 'is_public_badge')
    list_per_page = 20
    date_hierarchy = 'created_at'
    save_on_top = True
    inlines = [PhotoInline]
    
    fieldsets = [
        (_('Gallery Info'), {
            'fields': [
                'title', 
                'slug', 
                'description',
                'event',
                'photographer', 
                'price',
                'cover_photo',
                'cover_preview',
                'is_public_badge'
            ]
        }),
        (_('Settings'), {
            'fields': [
                'is_public',
                'is_active',
            ],
            'classes': ['collapse']
        }),
        (_('Actions'), {
            'fields': ['gallery_actions'],
            'classes': ['collapse']
        }),
        (_('Metadata'), {
            'fields': [
                'created_at',
                'updated_at',
            ],
            'classes': ['collapse']
        }),
    ]
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.event.name)
        return "—"
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def is_public_badge(self, obj):
        if obj.is_public:
            return format_html(
                '<span class="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">Public</span>'
            )
        return format_html(
            '<span class="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Private</span>'
        )
    is_public_badge.short_description = 'Status'
    is_public_badge.admin_order_field = 'is_public'
    
    def photo_count(self, obj):
        return obj.photos.count()
    photo_count.short_description = 'Photos'
    
    def price_formatted(self, obj):
        if obj.price:
            return f"${obj.price:.2f}"
        return "Free"
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
                '<img src="{0}" style="max-height: 200px; max-width: 100%; object-fit: contain;" />'
                '</a>',
                obj.cover_photo.image.url,
                reverse('admin:gallery_photo_change', args=[obj.cover_photo.id])
            )
        return "No cover photo set"
    cover_preview.short_description = 'Cover Preview'
    
    def gallery_actions(self, obj):
        return format_html(
            '<a class="button" href="{}" target="_blank">View on Site</a>',
            reverse('gallery:detail', args=[obj.slug])
        )
    gallery_actions.short_description = 'Actions'
    gallery_actions.allow_tags = True

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
    
    def admin_thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 60px; max-width: 80px; object-fit: cover;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_photo_change', args=[obj.id])
            )
        return "(No image)"
    admin_thumbnail.short_description = 'Thumbnail'
    admin_thumbnail.allow_tags = True
    
    def gallery_link(self, obj):
        if obj.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
        return "—"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Uploaded'
    created_short.admin_order_field = 'created_at'
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 300px; max-width: 100%; object-fit: contain;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_photo_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def dimensions(self, obj):
        if obj.width and obj.height:
            return f"{obj.width} × {obj.height}"
        return "—"
    dimensions.short_description = 'Dimensions'
    
    def file_size_mb(self, obj):
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return "—"
    file_size_mb.short_description = 'File Size'
    
    def photo_actions(self, obj):
        return format_html(
            '<a class="button" href="{}" target="_blank">View on Site</a>',
            reverse('gallery:photo_detail', args=[obj.gallery.slug, obj.id])
        )
    photo_actions.short_description = 'Actions'
    photo_actions.allow_tags = True

class DownloadAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'photo_thumbnail', 'photo_title', 'gallery_link', 'downloaded_short', 'ip_address')
    list_filter = ('downloaded_at', 'photo__gallery')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'photo__title', 'photo__gallery__title', 'ip_address')
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
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:auth_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "—"
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def photo_thumbnail(self, obj):
        if obj.photo and obj.photo.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 60px; max-width: 80px; object-fit: cover;" />'
                '</a>',
                obj.photo.image.url,
                reverse('admin:gallery_photo_change', args=[obj.photo.id])
            )
        return "(No image)"
    photo_thumbnail.short_description = 'Photo'
    photo_thumbnail.allow_tags = True
    
    def photo_title(self, obj):
        return obj.photo.title if obj.photo else "—"
    photo_title.short_description = 'Title'
    photo_title.admin_order_field = 'photo__title'
    
    def gallery_link(self, obj):
        if obj.photo and obj.photo.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.photo.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.gallery.title)
        return "—"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'photo__gallery__title'
    
    def downloaded_short(self, obj):
        return obj.downloaded_at.strftime('%b %d, %Y %H:%M')
    downloaded_short.short_description = 'Downloaded'
    downloaded_short.admin_order_field = 'downloaded_at'
    
    def photo_link(self, obj):
        if obj.photo:
            url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
            return format_html('<a href="{}">View Photo</a>', url)
        return "—"
    photo_link.short_description = 'Photo'

# Register models with the admin site
def register_models():
    # Register gallery models
    admin_site.register(Event, EventAdmin)
    admin_site.register(EventCoverImage, EventCoverImageAdmin)
    admin_site.register(Gallery, GalleryAdmin)
    admin_site.register(Photo, PhotoAdmin)
    admin_site.register(Download, DownloadAdmin)
    
    # Register auth models
    admin_site.register(Group, GroupAdmin)
    admin_site.register(Site, SiteAdmin)
    
    # Register the custom user model if available
    if HAS_CUSTOM_USER_ADMIN and not admin_site.is_registered(User):
        admin_site.register(User, CustomUserAdmin)

# Call the registration function
register_models()

# Add custom CSS
class Media:
    css = {
        'all': ('gallery/css/admin.css',)
    }
    (_('Gallery Info'), {
            'fields': (
                'title', 
                'slug', 
                'description',
                'event',
                'photographer', 
                'price',
                'cover_photo',
                'cover_preview',
                'is_public_badge'
            )
        }),
    (_('Settings'), {
            'fields': (
                'is_public',
                'is_active',
            ),
            'classes': ('collapse',)
        }),
    (_('Actions'), {
            'fields': ('gallery_actions',),
            'classes': ('collapse',)
        }),
    (_('Metadata'), {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),

    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, obj.event.name)
        return '—'
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def is_public_badge(self, obj):
        if obj.is_public:
            return format_html(
                '<span class="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">Public</span>'
            )
        return format_html(
            '<span class="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">Private</span>'
        )
    is_public_badge.short_description = 'Status'
    is_public_badge.admin_order_field = 'is_public'
    
    def photo_count(self, obj):
        return obj.photos.count()
    photo_count.short_description = 'Photos'
    
    def price_formatted(self, obj):
        if obj.price > 0:
            return f'${obj.price:.2f}'
        return 'Free'
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
                '<img src="{0}" style="max-height: 200px; max-width: 300px; object-fit: contain;" />'
                '</a>',
                obj.cover_photo.image.url,
                reverse('admin:gallery_photo_change', args=[obj.cover_photo.id])
            )
        return "No cover photo set"
    cover_preview.short_description = 'Cover Preview'
    
    def gallery_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">View on site</a>',
            reverse('gallery:detail', args=[obj.slug])
        )
    gallery_actions.short_description = 'Actions'
    gallery_actions.allow_tags = True

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
    
    def admin_thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 100px; height: 100px; object-fit: cover;" />',
                obj.image.url
            )
        return "(No image)"
    admin_thumbnail.short_description = 'Thumbnail'
    admin_thumbnail.allow_tags = True
    
    def gallery_link(self, obj):
        url = reverse('admin:gallery_gallery_change', args=[obj.gallery.id])
        return format_html('<a href="{}">{}</a>', url, obj.gallery.title)
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'gallery__title'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Uploaded'
    created_short.admin_order_field = 'created_at'
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 300px; max-width: 100%; object-fit: contain;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_photo_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def dimensions(self, obj):
        if obj.width and obj.height:
            return f"{obj.width} × {obj.height}"
        return "—"
    dimensions.short_description = 'Dimensions'
    
    def file_size_mb(self, obj):
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return "—"
    file_size_mb.short_description = 'File Size'
    
    def photo_actions(self, obj):
        return format_html(
            '<a class="button" href="{}" target="_blank">View on site</a>',
            reverse('photo:detail', args=[obj.id])
        )
    photo_actions.short_description = 'Actions'
    photo_actions.allow_tags = True

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
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:accounts_customuser_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "—"
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def photo_thumbnail(self, obj):
        if obj.photo and obj.photo.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;" />',
                obj.photo.image.url
            )
        return "—"
    photo_thumbnail.short_description = 'Photo'
    photo_thumbnail.allow_tags = True
    
    def photo_title(self, obj):
        return obj.photo.title if obj.photo else "—"
    photo_title.short_description = 'Title'
    photo_title.admin_order_field = 'photo__title'
    
    def gallery_link(self, obj):
        if obj.photo and obj.photo.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.photo.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.gallery.title)
        return "—"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'photo__gallery__title'
    
    def downloaded_short(self, obj):
        return obj.downloaded_at.strftime('%b %d, %Y %H:%M')
    downloaded_short.short_description = 'Downloaded'
    downloaded_short.admin_order_field = 'downloaded_at'
    
    def photo_link(self, obj):
        if obj.photo:
            url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
            return format_html('<a href="{}">View Photo</a>', url)
        return "—"
    photo_link.short_description = 'Photo'

# Register models with the admin site
def register_models():
    # Register gallery models
    admin_site.register(Event, EventAdmin)
    admin_site.register(EventCoverImage, EventCoverImageAdmin)
    admin_site.register(Gallery, GalleryAdmin)
    admin_site.register(Photo, PhotoAdmin)
    admin_site.register(Download, DownloadAdmin)
    
    # Register auth models
    admin_site.register(Group, GroupAdmin)
    admin_site.register(Site, SiteAdmin)
    
    # Register the custom user model if available
    if HAS_CUSTOM_USER_ADMIN and not admin_site.is_registered(User):
        admin_site.register(User, CustomUserAdmin)

# Call the registration function
register_models()

# Add custom CSS
class Media:
    css = {
        'all': ('gallery/css/admin.css',)
    }
    save_on_top = True
    inlines = [EventCoverImageInline]
    
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
        primary_cover = obj.primary_cover
        if primary_cover and primary_cover.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 100px; max-width: 150px; object-fit: cover; border-radius: 4px;" />'
                '</a>',
                primary_cover.image.url,
                reverse('admin:gallery_eventcoverimage_change', args=[primary_cover.id])
            )
        return "No cover image set"
    cover_preview.short_description = 'Cover Preview'
    
    def privacy_badge(self, obj):
        if obj.privacy == 'private':
            return format_html(
                '<span class="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">Private</span>'
            )
        return format_html(
            '<span class="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">Public</span>'
        )
    privacy_badge.short_description = 'Status'
    privacy_badge.admin_order_field = 'privacy'
    
    def pin_display(self, obj):
        if obj.privacy == 'private' and obj.pin:
            return format_html(
                '<div class="flex items-center">'
                '<input type="text" value="{}" readonly class="vTextField" id="pin-field">'
                '<button type="button" class="button" onclick="copyPin()" style="margin-left: 10px;">Copy</button>'
                '</div>'
                '<script>function copyPin() {{ document.getElementById("pin-field").select(); document.execCommand("copy"); }} </script>',
                obj.pin
            )
        return 'N/A'
    pin_display.short_description = 'Access PIN'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:  # Only set created_by during the first save
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(EventCoverImage, site=admin_site)
class EventCoverImageAdmin(admin.ModelAdmin):
    list_display = ('preview', 'event_link', 'is_primary', 'order', 'created_short')
    list_filter = ('is_primary', 'created_at')
    search_fields = ('caption', 'event__name')
    list_editable = ('is_primary', 'order')
    list_display_links = ('preview', 'event_link')
    readonly_fields = ('created_at', 'updated_at', 'preview')
    list_per_page = 20
    
    fieldsets = (
        (None, {
            'fields': ('event', 'image', 'preview', 'caption', 'is_primary', 'order')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<a href="{1}" target="_blank">'
                '<img src="{0}" style="max-height: 200px; max-width: 300px; object-fit: contain; border-radius: 4px;" />'
                '</a>',
                obj.image.url,
                reverse('admin:gallery_eventcoverimage_change', args=[obj.id])
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def event_link(self, obj):
        url = reverse('admin:gallery_event_change', args=[obj.event.id])
        return format_html('<a href="{}">{}</a>', url, obj.event.name)
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'

@admin.register(Gallery, site=admin_site)
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
            '<div class="action-buttons">'
            '<a href="{}" class="button" target="_blank">View on site</a> '
            '<a href="{}" class="button" style="background: #4CAF50;" target="_blank">Add Photos</a>'
            '</div>',
            reverse('gallery:gallery-detail', args=[obj.id]),
            '{}?gallery={}'.format(reverse('admin:gallery_photo_add'), obj.id)
        )
    gallery_actions.short_description = 'Actions'
    gallery_actions.allow_tags = True


@admin.register(Photo, site=admin_site)
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
            reverse('gallery:public-photo-detail', args=[obj.id]),
            '{}?gallery={}'.format(reverse('admin:gallery_gallery_change', args=[obj.gallery.id]), obj.gallery.id)
        )
    photo_actions.short_description = 'Actions'
    photo_actions.allow_tags = True


@admin.register(Download, site=admin_site)
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
