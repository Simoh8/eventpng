import uuid
from django.db import models
from django.core.validators import MinValueValidator

class Transaction(models.Model):
    """
    Tracks payment transactions.
    """
    TYPE_CHARGE = 'charge'
    TYPE_REFUND = 'refund'
    
    TYPE_CHOICES = [
        (TYPE_CHARGE, 'Charge'),
        (TYPE_REFUND, 'Refund'),
    ]
    
    STATUS_PENDING = 'pending'
    STATUS_SUCCEEDED = 'succeeded'
    STATUS_FAILED = 'failed'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_SUCCEEDED, 'Succeeded'),
        (STATUS_FAILED, 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        'payments.Order',
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    stripe_refund_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        try:
            transaction_type = self.get_transaction_type_display()
            amount = f"{float(self.amount):.2f}" if self.amount is not None else "0.00"
            currency = getattr(self, 'currency', 'USD')
            status = self.get_status_display()
            return f"{transaction_type} - {amount} {currency} ({status})"
        except Exception as e:
            return f"Transaction {getattr(self, 'id', 'unknown')} - error"
