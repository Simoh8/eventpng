from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from django.urls import reverse
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import Event, EventCoverImage, Gallery, Photo, Download

# Get the custom user model if it exists
User = get_user_model()
HAS_CUSTOM_USER_ADMIN = hasattr(User, 'is_photographer')

# Admin site instance
admin_site = admin.site

class EventCoverImageInline(admin.TabularInline):
    model = EventCoverImage
    extra = 1
    fields = ('image', 'caption', 'is_primary', 'order', 'preview')
    readonly_fields = ('preview',)
    
    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 100px;" />', obj.image.url)
        return "No image"
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
        if obj.cover_image:
            return format_html('<img src="{}" style="max-height: 200px;" />', obj.cover_image.image.url)
        return "No cover image"
    cover_preview.short_description = 'Cover Preview'
    
    def privacy_badge(self, obj):
        if obj.privacy == 'public':
            return format_html('<span style="padding: 5px; background: #4CAF50; color: white; border-radius: 4px;">Public</span>')
        else:
            return format_html('<span style="padding: 5px; background: #f44336; color: white; border-radius: 4px;">Private</span>')
    privacy_badge.short_description = 'Status'
    privacy_badge.admin_order_field = 'privacy'
    
    def pin_display(self, obj):
        return obj.pin if obj.privacy == 'private' else "—"
    pin_display.short_description = 'Access PIN'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'
    created_short.admin_order_field = 'created_at'
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:
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
            return format_html('<img src="{}" style="max-height: 100px;" />', obj.image.url)
        return "No image"
    preview.short_description = 'Preview'
    
    def event_link(self, obj):
        url = reverse('admin:gallery_event_change', args=[obj.event.id])
        return format_html('<a href="{}">{}</a>', url, obj.event.name)
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def created_short(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    created_short.short_description = 'Created'

# Register models with the admin site
def register_models():
    # Register gallery models only if not already registered
    if not admin_site.is_registered(Event):
        admin_site.register(Event, EventAdmin)
    if not admin_site.is_registered(EventCoverImage):
        admin_site.register(EventCoverImage, EventCoverImageAdmin)
    
    # Add other model registrations here if needed
    # ...

# Call the registration function
register_models()
