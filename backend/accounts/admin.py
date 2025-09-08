from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import CustomUser

class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'is_photographer', 'is_staff', 'is_active', 'date_joined_short')
    list_filter = ('is_photographer', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('email', 'full_name', 'id')
    ordering = ('-date_joined',)
    readonly_fields = ('last_login', 'date_joined', 'user_actions')
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        (_('Personal Info'), {
            'fields': ('full_name',)
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
        return mark_safe(
            '<a class="button" href="{}">View on site</a>'.format(
                reverse('user-detail', args=[obj.id])
            )
        )
    user_actions.short_description = 'Actions'

# This will be imported by the main admin.py to avoid circular imports
# The actual registration happens in gallery/admin.py
