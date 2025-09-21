from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from gallery.models import Photo  # Assuming you have a Photo model in your gallery app

User = get_user_model()

class CustomerProfile(models.Model):
    """Stores customer-specific profile information."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    total_purchases = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_downloads = models.PositiveIntegerField(
        default=0,
        help_text="Total number of photos downloaded by the customer"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s Profile"

class Purchase(models.Model):
    """Tracks customer purchases of photos."""
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    photo = models.ForeignKey(Photo, on_delete=models.SET_NULL, null=True, related_name='purchases')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateTimeField(auto_now_add=True)
    download_count = models.PositiveIntegerField(default=0)
    download_limit = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.customer.email} - {self.photo.title if self.photo else 'Deleted Photo'}"

class Favorite(models.Model):
    """Tracks customer's favorite photos."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'photo')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.photo.title}"

class Order(models.Model):
    """Represents a customer's order."""
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='customer_orders'  # Changed from 'orders' to 'customer_orders' to avoid conflict
    )
    order_number = models.CharField(max_length=20, unique=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number} - {self.customer.email}"

class OrderItem(models.Model):
    """Individual items within an order."""
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name='order_items'  # Changed from 'items' to 'order_items' for consistency
    )
    photo = models.ForeignKey(Photo, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity}x {self.photo.title if self.photo else 'Deleted Photo'} in Order #{self.order.order_number}"

    @property
    def subtotal(self):
        return self.quantity * self.price
