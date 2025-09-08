from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.http import JsonResponse
from django.utils.safestring import mark_safe
from .models import ContactSubmission

class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'formatted_phone', 'subject', 'status_badge', 'submitted_at', 'responded_at', 'assigned_to_display', 'actions_column')
    list_filter = ('status', 'submitted_at', 'responded_at', 'assigned_to')
    search_fields = ('name', 'email', 'phone_number', 'subject', 'message')
    readonly_fields = ('submitted_at', 'responded_at', 'status_badge', 'formatted_phone')
    list_per_page = 20
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'email', 'phone_number', 'country_code', 'subject')
        }),
        ('Message', {
            'fields': ('message',)
        }),
        ('Status', {
            'fields': ('status', 'status_badge', 'assigned_to', 'response_notes', 'is_processed')
        }),
        ('Timestamps', {
            'classes': ('collapse',),
            'fields': ('submitted_at', 'responded_at'),
        }),
    )
    
    def status_badge(self, obj):
        status_colors = {
            'new': 'gray',
            'in_progress': 'blue',
            'responded': 'green',
            'closed': 'red'
        }
        return format_html(
            '<span style="display: inline-block; padding: 3px 8px; border-radius: 12px; '
            'background: {}; color: white; font-size: 12px; font-weight: 500;">{}</span>',
            status_colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def formatted_phone(self, obj):
        return f"{obj.country_code}{obj.phone_number}"
    formatted_phone.short_description = 'Phone'
    
    def assigned_to_display(self, obj):
        if obj.assigned_to:
            try:
                # Get the user's display name
                user = obj.assigned_to
                display_name = user.get_full_name() or user.username or str(user)
                
                # Try to get the admin URL
                try:
                    url = reverse(f'admin:{user._meta.app_label}_{user._meta.model_name}_change', 
                                args=[user.id])
                    return format_html('<a href="{}">{}</a>', url, display_name)
                except:
                    return display_name
            except Exception as e:
                return str(obj.assigned_to)  # Fallback to string representation
        return "-"
    assigned_to_display.short_description = 'Assigned To'
    assigned_to_display.allow_tags = True

    def actions_column(self, obj):
        return format_html(
            '<a class="button" href="{}">View</a>&nbsp;',
            reverse('admin:contact_contactsubmission_change', args=[obj.id])
        )
    actions_column.short_description = 'Actions'
    actions_column.allow_tags = True
    
    def save_model(self, request, obj, form, change):
        # Set the assigned_to field if it's being changed
        if 'assigned_to' in form.changed_data and obj.assigned_to != request.user:
            obj.assigned_to = request.user
        super().save_model(request, obj, form, change)
        
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'count/',
                self.admin_site.admin_view(self.unread_count_view),
                name='contactsubmission_count',
            ),
        ]
        return custom_urls + urls
        
    def unread_count_view(self, request):
        # Count unread contacts (status='new')
        count = ContactSubmission.objects.filter(status='new').count()
        return JsonResponse({'count': count})

admin.site.register(ContactSubmission, ContactSubmissionAdmin)

# Also register with the custom admin site if it exists
try:
    from gallery.admin import admin_site
    admin_site.register(ContactSubmission, ContactSubmissionAdmin)
except (ImportError, AttributeError):
    pass
