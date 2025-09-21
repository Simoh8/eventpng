from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

class Purchase(models.Model):
    """
    Model to track customer purchases
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_purchases'  # Changed from 'purchases' to 'customer_purchases'
    )
    
    photo = models.ForeignKey(
        'gallery.Photo',
        on_delete=models.SET_NULL,
        null=True,
        related_name='purchases'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    purchase_date = models.DateTimeField(default=timezone.now)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_refunded = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-purchase_date']
        verbose_name = 'Purchase'
        verbose_name_plural = 'Purchases'
    
    def __str__(self):
        return f"{self.customer.email} - {self.photo.title if self.photo else 'Deleted Photo'} - {self.amount}"
