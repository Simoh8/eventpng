from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Order, OrderItem, Transaction, DownloadToken


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('photo_preview', 'photo_link')
    fields = ('photo_link', 'photo_preview', 'price')
    
    def photo_preview(self, obj):
        if obj.photo and obj.photo.image:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 100px;" />',
                obj.photo.image.url
            )
        return "(No image)"
    photo_preview.short_description = 'Preview'
    
    def photo_link(self, obj):
        if obj.photo:
            url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
            return mark_safe(f'<a href="{url}">{obj.photo.title}</a>')
        return "-"
    photo_link.short_description = 'Photo'


class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'stripe_link')
    fields = ('transaction_type', 'amount', 'currency', 'status', 'stripe_link', 'created_at')
    
    def stripe_link(self, obj):
        if obj.stripe_charge_id:
            url = f"https://dashboard.stripe.com/payments/{obj.stripe_charge_id}"
            return mark_safe(f'<a href="{url}" target="_blank">View in Stripe</a>')
        return "-"
    stripe_link.short_description = 'Stripe'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_email', 'status', 'total', 'currency', 'created_at', 'is_paid')
    list_filter = ('status', 'currency', 'created_at')
    search_fields = ('id', 'user__email', 'billing_email', 'billing_name', 'stripe_payment_intent_id')
    list_select_related = ('user',)
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'paid_at', 'user_link', 'stripe_payment_link',
        'stripe_customer_link', 'order_total'
    )
    fieldsets = (
        (None, {
            'fields': ('id', 'status', 'user_link')
        }),
        ('Billing Information', {
            'fields': ('billing_name', 'billing_email', 'billing_address')
        }),
        ('Payment Details', {
            'fields': (
                'subtotal', 'tax_amount', 'order_total', 'currency',
                'stripe_payment_link', 'stripe_customer_link', 'paid_at'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [OrderItemInline, TransactionInline]
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.id])
            return mark_safe(f'<a href="{url}">{obj.user.email}</a>')
        return "-"
    user_link.short_description = 'User'
    
    def stripe_payment_link(self, obj):
        if obj.stripe_payment_intent_id:
            url = f"https://dashboard.stripe.com/payments/{obj.stripe_payment_intent_id}"
            return mark_safe(f'<a href="{url}" target="_blank">{obj.stripe_payment_intent_id}</a>')
        return "-"
    stripe_payment_link.short_description = 'Stripe Payment'
    
    def stripe_customer_link(self, obj):
        if obj.stripe_customer_id:
            url = f"https://dashboard.stripe.com/customers/{obj.stripe_customer_id}"
            return mark_safe(f'<a href="{url}" target="_blank">{obj.stripe_customer_id}</a>')
        return "-"
    stripe_customer_link.short_description = 'Stripe Customer'
    
    def order_total(self, obj):
        return f"{obj.total} {obj.currency}"
    order_total.short_description = 'Total'
    
    def user_email(self, obj):
        return obj.user.email if obj.user else obj.billing_email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'billing_email'


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_id', 'transaction_type', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'currency', 'created_at')
    search_fields = ('id', 'order__id', 'stripe_charge_id', 'stripe_refund_id')
    list_select_related = ('order',)
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'stripe_charge_link', 'stripe_refund_link',
        'order_link', 'transaction_amount'
    )
    fieldsets = (
        (None, {
            'fields': ('id', 'order_link', 'transaction_type', 'status')
        }),
        ('Amount', {
            'fields': ('transaction_amount', 'description')
        }),
        ('Stripe', {
            'fields': ('stripe_payment_intent_id', 'stripe_charge_link', 'stripe_refund_link')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def order_link(self, obj):
        url = reverse('admin:payments_order_change', args=[obj.order.id])
        return mark_safe(f'<a href="{url}">Order {obj.order.id}</a>')
    order_link.short_description = 'Order'
    
    def stripe_charge_link(self, obj):
        if obj.stripe_charge_id:
            url = f"https://dashboard.stripe.com/payments/{obj.stripe_charge_id}"
            return mark_safe(f'<a href="{url}" target="_blank">{obj.stripe_charge_id}</a>')
        return "-"
    stripe_charge_link.short_description = 'Stripe Charge'
    
    def stripe_refund_link(self, obj):
        if obj.stripe_refund_id:
            url = f"https://dashboard.stripe.com/refunds/{obj.stripe_refund_id}"
            return mark_safe(f'<a href="{url}" target="_blank">{obj.stripe_refund_id}</a>')
        return "-"
    stripe_refund_link.short_description = 'Stripe Refund'
    
    def transaction_amount(self, obj):
        return f"{obj.amount} {obj.currency}"
    transaction_amount.short_description = 'Amount'
    
    def order_id(self, obj):
        return obj.order.id
    order_id.short_description = 'Order ID'
    order_id.admin_order_field = 'order__id'


@admin.register(DownloadToken)
class DownloadTokenAdmin(admin.ModelAdmin):
    list_display = ('token', 'order_id', 'photo_title', 'is_valid', 'is_used', 'expires_at')
    list_filter = ('is_used', 'expires_at', 'created_at')
    search_fields = ('token', 'order__id', 'photo__title')
    list_select_related = ('order', 'photo')
    readonly_fields = ('token', 'created_at', 'used_at', 'is_valid_field', 'order_link', 'photo_link')
    fieldsets = (
        (None, {
            'fields': ('token', 'order_link', 'photo_link', 'is_valid_field')
        }),
        ('Status', {
            'fields': ('is_used', 'used_at', 'expires_at')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def order_link(self, obj):
        url = reverse('admin:payments_order_change', args=[obj.order.id])
        return mark_safe(f'<a href="{url}">Order {obj.order.id}</a>')
    order_link.short_description = 'Order'
    
    def photo_link(self, obj):
        url = reverse('admin:gallery_photo_change', args=[obj.photo.id])
        return mark_safe(f'<a href="{url}">{obj.photo.title}</a>')
    photo_link.short_description = 'Photo'
    
    def is_valid_field(self, obj):
        return obj.is_valid
    is_valid_field.boolean = True
    is_valid_field.short_description = 'Is Valid'
    
    def order_id(self, obj):
        return obj.order.id
    order_id.short_description = 'Order ID'
    
    def photo_title(self, obj):
        return obj.photo.title
    photo_title.short_description = 'Photo'
