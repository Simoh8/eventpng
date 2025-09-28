from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import TicketTypeProxy, TicketPurchase
from gallery.ticket_models.models import EventTicket, TicketType


class EventTicketInline(admin.TabularInline):
    model = EventTicket
    extra = 1
    fields = ('event', 'price', 'quantity_available', 'is_active', 'sale_start', 'sale_end')
    show_change_link = True


class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'level', 'created_at', 'is_active')
    list_filter = ('is_active', 'group', 'level')
    search_fields = ('name', 'description', 'group__name', 'level__name')
    list_select_related = ('group', 'level')
    inlines = [EventTicketInline]
    readonly_fields = ('created_at', 'updated_at')
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
    list_display = ('id', 'user', 'get_ticket_type', 'quantity', 'total_price', 
                   'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 
                    'ticket_type__name', 'ticket_type__ticket_type__name')
    date_hierarchy = 'created_at'
    raw_id_fields = ('user', 'ticket_type')
    
    def get_ticket_type(self, obj):
        return obj.ticket_type.ticket_type.name if obj.ticket_type else 'N/A'
    get_ticket_type.short_description = 'Ticket Type'
    readonly_fields = ('created_at', 'updated_at', 'qr_code_preview')
    actions = ['mark_as_confirmed', 'mark_as_used', 'mark_as_cancelled']
    
    fieldsets = (
        (None, {
            'fields': ('user', 'ticket_type', 'quantity', 'total_price')
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
    
    def ticket_type_display(self, obj):
        return f"{obj.ticket_type.name} - {obj.ticket_type.event.title}"
    ticket_type_display.short_description = 'Ticket Type'
    
    def total_price_display(self, obj):
        return f"${obj.total_price:.2f}"
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
    mark_as_confirmed.short_description = "Mark selected tickets as confirmed"
    
    def mark_as_used(self, request, queryset):
        updated = queryset.filter(status='confirmed').update(status='used')
        self.message_user(request, f"{updated} ticket(s) marked as used.")
    mark_as_used.short_description = "Mark selected tickets as used"
    
    def mark_as_cancelled(self, request, queryset):
        for purchase in queryset.filter(status__in=['pending', 'confirmed']):
            purchase.cancel()
        self.message_user(request, f"{queryset.count()} ticket(s) cancelled.")
    mark_as_cancelled.short_description = "Cancel selected tickets"


# Register models with their admin classes
admin.site.register(TicketTypeProxy, TicketTypeAdmin)
admin.site.register(TicketPurchase, TicketPurchaseAdmin)

# Also register the original TicketType model with a basic admin
@admin.register(TicketType)
class OriginalTicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'level', 'is_active')
    list_filter = ('is_active', 'group', 'level')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
