import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone

class Order(models.Model):
    """
    Represents a customer's order for photos.
    """
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_REFUNDED = 'refunded'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=3, default='USD')
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    billing_email = models.EmailField()
    billing_name = models.CharField(max_length=255)
    billing_address = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        try:
            status = getattr(self, 'status', 'unknown')
            status_display = self.get_status_display() if hasattr(self, 'get_status_display') else status
            return f"Order {getattr(self, 'id', 'unknown')} - {status_display}"
        except Exception as e:
            return f"Order {getattr(self, 'id', 'unknown')} - error"
    
    def save(self, *args, **kwargs):
        # Update timestamps
        if self.status == self.STATUS_PAID and not self.paid_at:
            self.paid_at = timezone.now()
        
        # Calculate total if not set
        if not self.total and self.subtotal is not None:
            self.total = self.subtotal + self.tax_amount
            
        super().save(*args, **kwargs)
    
    @property
    def is_paid(self):
        return self.status == self.STATUS_PAID
