from django.db import models
from django.core.validators import MinValueValidator

class OrderItem(models.Model):
    """Represents a single item in an order."""
    order = models.ForeignKey(
        'payments.Order',
        on_delete=models.CASCADE,
        related_name='items'
    )
    photo = models.ForeignKey(
        'gallery.Photo',
        on_delete=models.PROTECT,
        related_name='order_items'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.photo} - ${self.price}"
