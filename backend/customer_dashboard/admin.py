from django.contrib import admin
from .models import CustomerProfile, Purchase, Favorite, Order, OrderItem

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_purchases', 'total_spent', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    list_filter = ('created_at', 'updated_at')

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'photo', 'amount', 'purchase_date', 'is_active')
    list_filter = ('is_active', 'purchase_date')
    search_fields = ('customer__email', 'photo__title')
    date_hierarchy = 'purchase_date'

@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'photo', 'created_at')
    search_fields = ('user__email', 'photo__title')
    list_filter = ('created_at',)
    date_hierarchy = 'created_at'

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('subtotal',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order_number', 'customer__email')
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline]

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'photo', 'quantity', 'price', 'subtotal')
    search_fields = ('order__order_number', 'photo__title')
    list_filter = ('created_at',)
    readonly_fields = ('subtotal',)
