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

from .models import Event, EventCoverImage, Gallery, Photo, Download, Ticket, EventRegistration
# Import ticket models and admin classes
from .ticket_models.models import TicketGroup, TicketLevel, TicketType, EventTicket
from .ticket_admin import TicketGroupAdmin, TicketLevelAdmin, TicketTypeAdmin, EventTicketAdmin
from .forms import EventForm, EventCoverImageForm, GalleryForm, PhotoForm, TicketForm, EventRegistrationForm

# Get the custom user model if it exists
User = get_user_model()
HAS_CUSTOM_USER_ADMIN = hasattr(User, 'is_photographer')

# Admin site instance
admin_site = admin.site

class TicketInline(admin.TabularInline):
    model = Ticket
    extra = 1
    fields = ('name', 'description', 'price', 'quantity_available', 'sale_start', 'sale_end', 'is_active', 'sold_count')
    readonly_fields = ('created_at', 'updated_at', 'sold_count')
    
    def sold_count(self, obj):
        if obj and obj.pk:
            return obj.registrations.count()
        return 0
    sold_count.short_description = 'Sold'
    
    # Add this to handle cases where the model might not be fully loaded yet
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event')


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

from .ticket_admin import EventTicketInline

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    form = EventForm
    list_display = ('name', 'date', 'location', 'ticket_status', 'ticket_actions', 'get_gallery_count', 'get_photo_count', 'privacy_badge', 'cover_preview', 'created_short')
    list_filter = ('privacy', 'date', 'created_at', 'created_by', 'has_tickets', 'ticket_type')
    search_fields = ('name', 'location', 'description', 'created_by__email', 'created_by__full_name')
    list_select_related = ('created_by',)
    readonly_fields = ('created_at', 'updated_at', 'pin_display', 'cover_preview', 'get_gallery_count', 
                      'get_photo_count', 'created_by_display', 'ticket_status', 'ticket_management_links')
    list_per_page = 25
    date_hierarchy = 'date'
    save_on_top = True
    inlines = [EventCoverImageInline]
    actions = ['make_public', 'make_private', 'export_event_attendees', 'enable_ticketing', 'disable_ticketing']
    
    def get_inlines(self, request, obj=None):
        inlines = [EventCoverImageInline]
        if obj and obj.has_tickets:
            inlines.append(EventTicketInline)
        return inlines
    
    fieldsets = (
        (_('Event Information'), {
            'fields': ('name', 'slug', 'description', 'date', 'end_date', 'location')
        }),
        (_('Ticket Settings'), {
            'fields': ('has_tickets', 'ticket_type', 'max_attendees'),
            'classes': ('collapse', 'ticket-settings')
        }),
        (_('Privacy Settings'), {
            'fields': ('privacy', 'pin_display'),
            'classes': ('collapse',)
        }),
        (_('Cover Image'), {
            'fields': ('cover_preview',),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('created_by_display', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        # Ensure has_tickets is in the first fieldset if it's not already there
        if obj is None:  # Only for add form
            for fieldset in fieldsets:
                if fieldset[0] == _('Event Information'):
                    if 'has_tickets' not in fieldset[1]['fields']:
                        fieldset[1]['fields'] += ('has_tickets',)
                        
        # Add ticket management section for existing events with ticketing enabled
        if obj and obj.has_tickets:
            fieldsets = list(fieldsets)
            # Insert after the first fieldset
            fieldsets.insert(1, (
                _('Ticket Management'), {
                    'fields': ('ticket_management_links',),
                    'classes': ('collapse', 'ticket-management'),
                    'description': _('Manage tickets for this event')
                }
            ))
            
        return fieldsets
        
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.annotate(
            gallery_count=Count('galleries', distinct=True),
            photo_count=Count('galleries__photos', distinct=True)
        )
        return qs
        
    def get_gallery_count(self, obj):
        url = reverse('admin:gallery_gallery_changelist') + f'?event__id__exact={obj.id}'
        return format_html('<a href="{}">{}</a>', url, obj.gallery_count)
    get_gallery_count.short_description = 'Galleries'
    get_gallery_count.admin_order_field = 'gallery_count'
    
    def get_photo_count(self, obj):
        return obj.photo_count
    get_photo_count.short_description = 'Photos'
    get_photo_count.admin_order_field = 'photo_count'
    
    def export_event_attendees(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, "Please select exactly one event to export attendees.", messages.ERROR)
            return
            
        event = queryset.first()
        registrations = EventRegistration.objects.filter(event=event).select_related('ticket', 'user', 'payment')
        
        if not registrations.exists():
            self.message_user(request, "No attendees found for this event.", messages.WARNING)
            return
            
        import csv
        from django.http import HttpResponse
        from io import StringIO
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{event.slug}_attendees.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Registration ID', 'Ticket', 'First Name', 'Last Name', 'Email',
            'Status', 'Checked In', 'Checked In At', 'Registration Date'
        ])
        
        for reg in registrations:
            writer.writerow([
                reg.id,
                reg.ticket.name if reg.ticket else 'N/A',
                reg.first_name,
                reg.last_name,
                reg.email,
                reg.get_status_display(),
                'Yes' if reg.checked_in else 'No',
                reg.checked_in_at.strftime('%Y-%m-%d %H:%M') if reg.checked_in_at else '',
                reg.registration_date.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response
    export_event_attendees.short_description = "Export attendees to CSV"
    
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
    
    def ticket_status(self, obj):
        if not obj.has_tickets:
            return format_html('<span class="status-tag" style="background: #999; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">No Tickets</span>')
        
        now = timezone.now()
        active_tickets = obj.event_tickets.filter(is_active=True)
        
        if not active_tickets.exists():
            return format_html('<span class="status-tag" style="background: #f0ad4e; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">No Active Tickets</span>')
        
        # Check if any tickets are on sale
        on_sale = any(t.is_available for t in active_tickets)
        
        if on_sale:
            return format_html('<span class="status-tag" style="background: #5cb85c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Tickets On Sale</span>')
        else:
            return format_html('<span class="status-tag" style="background: #d9534f; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">Sales Ended</span>')
    
    def ticket_actions(self, obj):
        if not obj.has_tickets:
            return format_html(
                '<a class="button" href="{}?event={}">Enable Ticketing</a>',
                reverse('admin:gallery_event_changelist'),
                obj.id
            )
        
        manage_url = reverse('admin:gallery_eventticket_changelist') + f'?event__id__exact={obj.id}'
        add_url = reverse('admin:gallery_eventticket_add') + f'?event={obj.id}'
        
        return format_html(
            '<div class="ticket-actions">'
            '<a class="button" href="{}">Manage Tickets</a> '
            '<a class="button" href="{}">Add Ticket</a>'
            '</div>',
            manage_url,
            add_url
        )
    ticket_actions.short_description = 'Ticket Actions'
    ticket_actions.allow_tags = True
    
    def ticket_management_links(self, obj):
        if not obj.has_tickets:
            return "Enable ticketing to manage tickets for this event"
            
        manage_url = reverse('admin:gallery_eventticket_changelist') + f'?event__id__exact={obj.id}'
        add_url = reverse('admin:gallery_eventticket_add') + f'?event={obj.id}'
        
        return format_html(
            '<div class="ticket-management-links">'
            '<a class="button" href="{}" style="margin-right: 10px;">View All Tickets</a>'
            '<a class="button" href="{}" style="background: #417690; color: white;">Add New Ticket</a>'
            '</div>',
            manage_url,
            add_url
        )
    ticket_management_links.short_description = 'Manage Tickets'
    ticket_management_links.allow_tags = True
    
    def enable_ticketing(self, request, queryset):
        updated = queryset.update(has_tickets=True)
        self.message_user(
            request,
            f'Successfully enabled ticketing for {updated} event(s).',
            messages.SUCCESS
        )
    enable_ticketing.short_description = 'Enable ticketing for selected events'
    
    def disable_ticketing(self, request, queryset):
        updated = queryset.update(has_tickets=False)
        self.message_user(
            request,
            f'Disabled ticketing for {updated} event(s).',
            messages.WARNING
        )
    disable_ticketing.short_description = 'Disable ticketing for selected events'
    
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
    
    class Media:
        css = {
            'all': ('css/admin.css',)
        }
        js = ('js/admin/event_admin.js',)
    
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
    search_fields = ('user__email', 'user__full_name', 'photo__title', 'photo__gallery__title', 'photo__gallery__event__name')
    readonly_fields = ('downloaded_at', 'user_link', 'photo_preview', 'gallery_link', 'file_size_mb', 'download_actions')
    list_per_page = 30
    date_hierarchy = 'downloaded_at'
    actions = ['resend_download_links', 'export_downloads_csv']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'photo', 'photo__gallery', 'payment')
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "-"
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def gallery_link(self, obj):
        if obj.photo and hasattr(obj.photo, 'gallery') and obj.photo.gallery:
            url = reverse('admin:gallery_gallery_change', args=[obj.photo.gallery.id])
            return format_html('<a href="{}">{}</a>', url, obj.photo.gallery.title)
        return "-"
    gallery_link.short_description = 'Gallery'
    gallery_link.admin_order_field = 'photo__gallery__title'
    
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
        for download in queryset.select_related('user', 'photo', 'photo__gallery', 'photo__gallery__event'):
            writer.writerow([
                download.id,
                download.user.email if download.user else '',
                download.photo.title if download.photo else '',
                download.photo.gallery.title if (download.photo and download.photo.gallery) else '',
                download.photo.gallery.event.name if (
                    download.photo and download.photo.gallery and hasattr(download.photo.gallery, 'event') and download.photo.gallery.event
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

class TicketAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_link', 'price', 'quantity_available', 'is_active', 'created_at_short')
    list_filter = ('is_active', 'event', 'created_at')
    search_fields = ('name', 'description', 'event__name')
    list_select_related = ('event',)
    readonly_fields = ('created_at', 'updated_at', 'event_link')
    list_per_page = 25
    date_hierarchy = 'created_at'
    save_on_top = True
    
    fieldsets = (
        (None, {
            'fields': ('event', 'name', 'description', 'price', 'quantity_available', 'is_active')
        }),
        ('Sale Period', {
            'fields': ('sale_start', 'sale_end'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('event_link', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('event').annotate(
            sold_count=Count('registrations')
        )
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Only show events that have tickets enabled
        if 'event' in form.base_fields:
            form.base_fields['event'].queryset = Event.objects.filter(has_tickets=True)
        return form
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'event':
            kwargs["queryset"] = Event.objects.filter(has_tickets=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, str(obj.event))
        return "-"
    event_link.short_description = 'Event'
    event_link.allow_tags = True
    
    def created_at_short(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    created_at_short.short_description = 'Created'
    created_at_short.admin_order_field = 'created_at'


class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event_link', 'ticket_type', 'attendee_name', 'email', 'status_badge', 'checked_in_badge', 'registration_date_short')
    list_filter = ('status', 'checked_in', 'event', 'ticket', 'registration_date')
    search_fields = ('first_name', 'last_name', 'email', 'event__name', 'ticket__name')
    list_select_related = ('event', 'ticket', 'user', 'payment')
    readonly_fields = ('registration_date', 'checked_in_at', 'registration_details')
    list_per_page = 30
    date_hierarchy = 'registration_date'
    save_on_top = True
    actions = ['mark_confirmed', 'mark_attended', 'mark_no_show', 'check_in', 'export_registrations_csv']
    
    fieldsets = (
        ('Attendee Information', {
            'fields': (('first_name', 'last_name'), 'email', 'user')
        }),
        ('Event & Ticket', {
            'fields': ('event', 'ticket')
        }),
        ('Status', {
            'fields': ('status', 'checked_in', 'checked_in_at')
        }),
        ('Additional Information', {
            'fields': ('notes', 'registration_details'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('event', 'ticket', 'user', 'payment')
    
    def event_link(self, obj):
        if obj.event:
            url = reverse('admin:gallery_event_change', args=[obj.event.id])
            return format_html('<a href="{}">{}</a>', url, str(obj.event))
        return "-"
    event_link.short_description = 'Event'
    event_link.admin_order_field = 'event__name'
    
    def attendee_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    attendee_name.short_description = 'Attendee'
    attendee_name.admin_order_field = 'last_name'
    
    def ticket_type(self, obj):
        return obj.ticket.name if obj.ticket else "-"
    ticket_type.short_description = 'Ticket Type'
    ticket_type.admin_order_field = 'ticket__name'
    
    def status_badge(self, obj):
        status_colors = {
            'pending': 'orange',
            'confirmed': 'green',
            'cancelled': 'red',
            'attended': 'blue',
            'no_show': 'gray'
        }
        color = status_colors.get(obj.status, 'gray')
        return format_html(
            '<span style="display: inline-block; padding: 3px 8px; border-radius: 12px; '
            'background: {}; color: white; font-size: 12px; text-transform: capitalize;">'
            '{}</span>', color, obj.status
        )
    status_badge.short_description = 'Status'
    status_badge.allow_tags = True
    
    def checked_in_badge(self, obj):
        if obj.checked_in:
            return format_html(
                '<span style="display: inline-block; padding: 3px 8px; border-radius: 12px; '
                'background: green; color: white; font-size: 12px;">'
                'Checked In</span>'
            )
        return format_html(
            '<span style="display: inline-block; padding: 3px 8px; border-radius: 12px; '
            'background: #ccc; color: #666; font-size: 12px;">'
            'Not Checked In</span>'
        )
    checked_in_badge.short_description = 'Check-in Status'
    checked_in_badge.allow_tags = True
    
    def registration_date_short(self, obj):
        return obj.registration_date.strftime('%Y-%m-%d %H:%M')
    registration_date_short.short_description = 'Registered'
    registration_date_short.admin_order_field = 'registration_date'
    
    def registration_details(self, obj):
        details = [
            f'<strong>Registration ID:</strong> {obj.id}',
            f'<strong>Date:</strong> {obj.registration_date.strftime("%Y-%m-%d %H:%M")}'
        ]
        if obj.payment:
            details.append(f'<strong>Payment:</strong> {obj.payment.get_status_display()} (ID: {obj.payment.id})')
        if obj.checked_in and obj.checked_in_at:
            details.append(f'<strong>Checked in at:</strong> {obj.checked_in_at.strftime("%Y-%m-%d %H:%M")}')
        return mark_safe('<br>'.join(details))
    registration_details.short_description = 'Registration Details'
    registration_details.allow_tags = True
    
    def mark_confirmed(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='confirmed')
        self.message_user(request, f"{updated} registration(s) marked as confirmed.", messages.SUCCESS)
    mark_confirmed.short_description = "Mark selected registrations as confirmed"
    
    def mark_attended(self, request, queryset):
        updated = queryset.update(status='attended', checked_in=True, checked_in_at=timezone.now())
        self.message_user(request, f"{updated} registration(s) marked as attended.", messages.SUCCESS)
    mark_attended.short_description = "Mark selected registrations as attended"
    
    def mark_no_show(self, request, queryset):
        updated = queryset.update(status='no_show')
        self.message_user(request, f"{updated} registration(s) marked as no-show.", messages.SUCCESS)
    mark_no_show.short_description = "Mark selected registrations as no-show"
    
    def check_in(self, request, queryset):
        updated = queryset.exclude(checked_in=True).update(
            checked_in=True, 
            checked_in_at=timezone.now()
        )
        self.message_user(request, f"Checked in {updated} attendee(s).", messages.SUCCESS)
    check_in.short_description = "Check in selected attendees"
    
    def export_registrations_csv(self, request, queryset):
        import csv
        from django.http import HttpResponse
        from io import StringIO
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="event_registrations.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Registration ID', 'Event', 'Ticket Type', 'First Name', 'Last Name', 
            'Email', 'Status', 'Checked In', 'Checked In At', 'Registration Date'
        ])
        
        for reg in queryset.select_related('event', 'ticket'):
            writer.writerow([
                reg.id,
                reg.event.name,
                reg.ticket.name if reg.ticket else 'N/A',
                reg.first_name,
                reg.last_name,
                reg.email,
                reg.get_status_display(),
                'Yes' if reg.checked_in else 'No',
                reg.checked_in_at.strftime('%Y-%m-%d %H:%M') if reg.checked_in_at else '',
                reg.registration_date.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response
    export_registrations_csv.short_description = "Export selected registrations to CSV"


# Unregister default models that we don't need
admin.site.unregister(Group)
admin.site.unregister(Site)

# Register models that aren't already registered with @admin.register()
admin.site.register(Ticket, TicketAdmin)
admin.site.register(EventRegistration, EventRegistrationAdmin)

# Ticket models are registered in ticket_admin.py
