from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import TicketPurchase
from gallery.ticket_models.models import EventTicket, TicketType


class EventTicketInline(admin.TabularInline):
    model = EventTicket
    extra = 1
    fields = ('event', 'price', 'quantity_available', 'is_active', 'sale_start', 'sale_end')
    show_change_link = True


class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'level', 'created_at', 'is_active')
    list_filter = ('is_active', 'group', 'level')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [EventTicketInline]
    fieldsets = (
        (None, {
            'fields': ('name', 'group', 'level', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class TicketPurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_event_ticket', 'quantity', 'total_price_display', 
                   'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 
                    'event_ticket__ticket_type__name', 'event_ticket__event__name')
    date_hierarchy = 'created_at'
    raw_id_fields = ('user', 'event_ticket')
    
    def get_event_ticket(self, obj):
        if obj.event_ticket and hasattr(obj.event_ticket, 'event') and hasattr(obj.event_ticket, 'ticket_type'):
            return f"{obj.event_ticket.event.name} - {obj.event_ticket.ticket_type.name}"
        return 'N/A'
    get_event_ticket.short_description = 'Event Ticket'
    readonly_fields = ('created_at', 'updated_at', 'qr_code_preview')
    actions = ['mark_as_confirmed', 'mark_as_used', 'mark_as_cancelled']
    
    fieldsets = (
        (None, {
            'fields': ('user', 'event_ticket', 'quantity', 'total_price')
        }),
        ('Status', {
            'fields': ('status', 'payment_method')
        }),
        ('QR Code', {
            'fields': ('qr_code_preview', 'qr_code')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total_price_display(self, obj):
        return f"${obj.total_price:.2f}" if obj.total_price else 'N/A'
    total_price_display.short_description = 'Total Price'
    total_price_display.admin_order_field = 'total_price'
    
    def qr_code_preview(self, obj):
        if obj.qr_code:
            return mark_safe(f'<img src="{obj.qr_code.url}" style="max-height: 200px;" />')
        return "No QR code generated yet"
    qr_code_preview.short_description = 'QR Code Preview'
    
    # Admin actions
    def mark_as_confirmed(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='confirmed')
        self.message_user(request, f"{updated} ticket(s) marked as confirmed.")
    
    def mark_as_used(self, request, queryset):
        updated = queryset.filter(status='confirmed').update(status='used')
        self.message_user(request, f"{updated} ticket(s) marked as used.")
    
    def mark_as_cancelled(self, request, queryset):
        for purchase in queryset.filter(status__in=['pending', 'confirmed']):
            # Restore ticket quantity if needed
            if purchase.event_ticket and purchase.event_ticket.quantity_available is not None:
                purchase.event_ticket.quantity_available += purchase.quantity
                purchase.event_ticket.save(update_fields=['quantity_available'])
            purchase.status = 'cancelled'
            purchase.save(update_fields=['status'])
        self.message_user(request, f"{queryset.count()} ticket(s) cancelled.")


# Register models with their admin classes
admin.site.register(TicketPurchase, TicketPurchaseAdmin)

# Register the TicketType from gallery if not already registered
if not admin.site.is_registered(TicketType):
    admin.site.register(TicketType, TicketTypeAdmin)
