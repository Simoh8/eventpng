from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import TicketType, TicketPurchase


class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'event', 'price', 'quantity_available', 'is_active', 'sale_status')
    list_filter = ('is_active', 'event', 'sale_start', 'sale_end')
    search_fields = ('name', 'event__title', 'description')
    date_hierarchy = 'sale_start'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'event', 'description', 'price')
        }),
        ('Availability', {
            'fields': ('quantity_available', 'is_active', 'sale_start', 'sale_end')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def sale_status(self, obj):
        from django.utils import timezone
        now = timezone.now()
        
        if not obj.is_active:
            return 'Inactive'
        if obj.quantity_available == 0:
            return 'Sold Out'
        if obj.sale_start and now < obj.sale_start:
            return 'Not Started'
        if obj.sale_end and now > obj.sale_end:
            return 'Ended'
        return 'On Sale'
    
    sale_status.short_description = 'Sale Status'
    sale_status.admin_order_field = 'sale_start'


class TicketPurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'ticket_type_display', 'quantity', 'total_price_display', 
                   'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'ticket_type__name')
    date_hierarchy = 'created_at'
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
admin.site.register(TicketType, TicketTypeAdmin)
admin.site.register(TicketPurchase, TicketPurchaseAdmin)
