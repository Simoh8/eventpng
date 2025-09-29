from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .ticket_models.models import TicketGroup, TicketLevel, TicketType, EventTicket


class TicketGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    list_editable = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)


class TicketLevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    list_editable = ('display_order', 'is_active')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('display_order', 'name')


class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'level', 'is_active', 'created_at')
    list_filter = ('group', 'level', 'is_active')
    search_fields = ('name', 'description', 'group__name', 'level__name')
    list_editable = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('group__name', 'level__display_order', 'name')


class EventTicketInline(admin.TabularInline):
    model = EventTicket
    extra = 0
    fields = ('ticket_type', 'price', 'quantity_available', 'sale_start', 'sale_end', 'is_active')
    readonly_fields = ('remaining_quantity', 'created_at')
    show_change_link = True

    def remaining_quantity(self, obj):
        return obj.remaining_quantity
    remaining_quantity.short_description = 'Remaining'


class EventTicketAdmin(admin.ModelAdmin):
    list_display = ('event', 'ticket_type_display', 'price', 'price_with_currency', 'remaining_quantity', 'is_available', 'is_active')
    list_filter = ('ticket_type__group', 'ticket_type__level', 'is_active', 'currency')
    search_fields = ('event__name', 'ticket_type__name', 'ticket_type__group__name', 'ticket_type__level__name')
    list_editable = ('price', 'is_active')
    readonly_fields = ('created_at', 'updated_at', 'remaining_quantity', 'price_with_currency')
    date_hierarchy = 'sale_start'
    
    fieldsets = (
        (None, {
            'fields': ('event', 'ticket_type', 'price', 'currency', 'quantity_available')
        }),
        ('Sale Period', {
            'fields': ('sale_start', 'sale_end')
        }),
        ('Status', {
            'fields': ('is_active', 'remaining_quantity')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def ticket_type_display(self, obj):
        return f"{obj.ticket_type.group} - {obj.ticket_type.level} - {obj.ticket_type.name}"
    ticket_type_display.short_description = 'Ticket Type'
    ticket_type_display.admin_order_field = 'ticket_type__name'

    def is_available(self, obj):
        return obj.is_available()
    is_available.boolean = True
    is_available.short_description = 'Available'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'event', 'ticket_type__group', 'ticket_type__level'
        )


# Register all admin classes
admin.site.register(TicketGroup, TicketGroupAdmin)
admin.site.register(TicketLevel, TicketLevelAdmin)
admin.site.register(TicketType, TicketTypeAdmin)
admin.site.register(EventTicket, EventTicketAdmin)
