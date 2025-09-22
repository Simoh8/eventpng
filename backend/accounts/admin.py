from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html, mark_safe
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q, F
from django.contrib.auth.models import Group
from django.contrib import messages
from django.utils.safestring import mark_safe

from .models import CustomUser
from gallery.models import Gallery, Photo, Download

class GalleryInline(admin.StackedInline):
    model = Gallery
    extra = 0
    max_num = 5
    show_change_link = True
    fields = ('title', 'event', 'is_public', 'created_at')
    readonly_fields = ('created_at',)
    
    def has_add_permission(self, request, obj=None):
        return False

class PhotoInline(admin.StackedInline):
    model = Photo
    extra = 0
    max_num = 5
    show_change_link = True
    fields = ('title', 'gallery', 'is_featured', 'is_public', 'created_at')
    readonly_fields = ('created_at',)
    
    def has_add_permission(self, request, obj=None):
        return False

class DownloadInline(admin.StackedInline):
    model = Download
    extra = 0
    max_num = 5
    show_change_link = True
    fields = ('photo', 'payment', 'downloaded_at', 'ip_address')
    readonly_fields = ('downloaded_at', 'ip_address')
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'user_type_badge', 'gallery_count', 'photo_count', 'download_count', 
                   'is_active', 'date_joined_short', 'last_login_short', 'user_actions')
    list_filter = ('is_photographer', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('email', 'full_name', 'id', 'phone_number')
    ordering = ('-date_joined',)
    readonly_fields = ('last_login', 'date_joined', 'user_actions', 'gallery_count', 'photo_count', 'download_count')
    inlines = [GalleryInline, PhotoInline, DownloadInline]
    actions = ['activate_users', 'deactivate_users', 'make_photographer', 'remove_photographer']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        (_('Personal Info'), {
            'fields': ('full_name', 'phone_number', 'bio')
        }),
        (_('User Statistics'), {
            'fields': ('gallery_count', 'photo_count', 'download_count'),
            'classes': ('collapse',)
        }),
        (_('Permissions'), {
            'fields': (
                'is_active', 
                'is_staff', 
                'is_superuser',
                'is_photographer',
                'groups', 
                'user_permissions'
            ),
            'classes': ('collapse',)
        }),
        (_('Important Dates'), {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            gallery_count=Count('galleries', distinct=True),
            photo_count=Count('uploaded_photos', distinct=True),
            download_count=Count('downloads', distinct=True)
        )
        
    def gallery_count(self, obj):
        return obj.gallery_count
    gallery_count.short_description = 'Galleries'
    gallery_count.admin_order_field = 'gallery_count'
    
    def photo_count(self, obj):
        return obj.photo_count
    photo_count.short_description = 'Photos'
    photo_count.admin_order_field = 'photo_count'
    
    def download_count(self, obj):
        return obj.download_count
    download_count.short_description = 'Downloads'
    download_count.admin_order_field = 'download_count'
    
    def user_type_badge(self, obj):
        if obj.is_superuser:
            badge_type = 'red'
            user_type = 'Admin'
        elif obj.is_photographer:
            badge_type = 'blue'
            user_type = 'Photographer'
        else:
            badge_type = 'green'
            user_type = 'Customer'
            
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; display: inline-block; min-width: 80px; text-align: center;">{}</span>',
            badge_type, user_type
        )
    user_type_badge.short_description = 'Type'
    user_type_badge.admin_order_field = 'is_photographer'
    
    def last_login_short(self, obj):
        if obj.last_login:
            now = timezone.now()
            delta = now - obj.last_login
            
            if delta.days > 30:
                return f"{obj.last_login.strftime('%b %d, %Y')}"
            elif delta.days > 0:
                return f"{delta.days}d ago"
            elif delta.seconds >= 3600:
                hours = delta.seconds // 3600
                return f"{hours}h ago"
            elif delta.seconds >= 60:
                minutes = delta.seconds // 60
                return f"{minutes}m ago"
            else:
                return "Just now"
        return "Never"
    last_login_short.short_description = 'Last Login'
    last_login_short.admin_order_field = 'last_login'
    
    def date_joined_short(self, obj):
        return obj.date_joined.strftime('%b %d, %Y')
    date_joined_short.short_description = 'Joined'
    date_joined_short.admin_order_field = 'date_joined'
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 
                'password1', 
                'password2',
                'full_name',
                'is_photographer',
                'is_staff',
                'is_active'
            ),
        }),
    )
    
    def date_joined_short(self, obj):
        return obj.date_joined.strftime('%Y-%m-%d')
    date_joined_short.short_description = 'Joined'
    date_joined_short.admin_order_field = 'date_joined'
    
    def user_actions(self, obj):
        return format_html(
            '<div class="user-actions">'
            '<a class="button" href="{}" style="padding: 2px 8px; background: #417690; color: white; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 5px;">View</a>'
            '<a class="button" href="{}" style="padding: 2px 8px; background: #5b80b9; color: white; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 5px;">Edit</a>'
            '</div>',
            reverse('admin:accounts_customuser_change', args=[obj.id]),
            reverse('admin:accounts_customuser_change', args=[obj.id])
        )
    user_actions.short_description = 'Actions'
    user_actions.allow_tags = True
    
    def profile_picture_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 100px; border-radius: 4px;" />',
                obj.profile_picture.url
            )
        return "No image"
    profile_picture_preview.short_description = 'Profile Preview'
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Successfully activated {updated} user(s).', messages.SUCCESS)
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Successfully deactivated {updated} user(s).', messages.SUCCESS)
    deactivate_users.short_description = "Deactivate selected users"
    
    def make_photographer(self, request, queryset):
        updated = queryset.update(is_photographer=True)
        self.message_user(request, f'Successfully made {updated} user(s) photographers.', messages.SUCCESS)
    make_photographer.short_description = "Make selected users photographers"
    
    def remove_photographer(self, request, queryset):
        updated = queryset.update(is_photographer=False)
        self.message_user(request, f'Successfully removed photographer status from {updated} user(s).', messages.SUCCESS)
    remove_photographer.short_description = "Remove photographer status"
    
    def _safe_delete_related_objects(self, user):
        """Safely delete all related objects for a user."""
        from django.db import transaction
        from django.apps import apps
        
        # Get all related objects
        related_objects = [
            f for f in user._meta.get_fields()
            if (f.one_to_many or f.one_to_one) and f.auto_created and not f.concrete
        ]
        
        with transaction.atomic():
            # First, handle notification preferences
            if hasattr(user, 'notification_preferences'):
                try:
                    user.notification_preferences.delete()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
            
            # Delete other related objects
            for related_obj in related_objects:
                try:
                    # Handle one-to-one fields
                    if related_obj.one_to_one:
                        related = getattr(user, related_obj.get_accessor_name(), None)
                        if related:
                            related.delete()
                    # Handle one-to-many fields
                    else:
                        related_manager = getattr(user, related_obj.get_accessor_name(), None)
                        if related_manager:
                            related_manager.all().delete()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
    
    def delete_model(self, request, obj):
        """
        Handle model deletion to prevent errors during user deletion.
        """
        try:
            # First, handle related objects that might cause issues
            self._safe_delete_related_objects(obj)
            
            # Get user email before deletion for the success message
            user_email = getattr(obj, 'email', 'User')
            user_id = getattr(obj, 'id', 'unknown')
            
            # Proceed with the normal deletion
            obj.delete()
            
            # Show success message
            from django.contrib import messages
            messages.success(
                request,
                f"The user '{user_email if user_email else 'User'}' was deleted successfully."
            )
            
        except Exception as e:
            # Log the error and show a user-friendly message
            import logging
            logger = logging.getLogger(__name__)
            
            from django.contrib import messages
            messages.error(
                request,
                "An error occurred while deleting the user. Please try again or contact support if the problem persists."
            )
    
    def delete_queryset(self, request, queryset):
        """
        Handle bulk deletion of users.
        """
        deleted_count = 0
        for user in queryset:
            try:
                self._safe_delete_related_objects(user)
                user.delete()
                deleted_count += 1
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
        
        from django.contrib import messages
        if deleted_count > 0:
            messages.success(
                request,
                f"Successfully deleted {deleted_count} user(s)."
            )
        if deleted_count < len(queryset):
            messages.warning(
                request,
                f"Could not delete {len(queryset) - deleted_count} user(s). Please check the logs for more details."
            )

# Unregister the default User model if it's already registered
try:
    from django.contrib.auth.models import User
    admin.site.unregister(User)
except Exception as e:
    pass
