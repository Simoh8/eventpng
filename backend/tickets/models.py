import logging
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import qrcode
from io import BytesIO
from django.core.files import File
from django.core.validators import MinValueValidator
from django.urls import reverse
from gallery.models import Event

logger = logging.getLogger(__name__)

# Import the EventTicket model from the gallery app
from gallery.ticket_models.models import EventTicket


class TicketPurchase(models.Model):
    """Model representing a user's ticket purchase"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('used', 'Used')
    ]
    
    PAYMENT_METHODS = [
        ('card', 'Credit/Debit Card'),
        ('paypal', 'PayPal'),
        ('cash', 'Cash at Venue')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='ticket_purchases'
    )
    event_ticket = models.ForeignKey(
        EventTicket,
        on_delete=models.PROTECT,
        related_name='purchases',
        help_text='The event-specific ticket that was purchased',
        verbose_name='event ticket',
        db_column='ticket_type_id'  # Keep the same database column name for backward compatibility
    )
    
    # For backward compatibility, create a property that maps to event_ticket
    @property
    def ticket_type(self):
        return self.event_ticket
        
    @ticket_type.setter
    def ticket_type(self, value):
        self.event_ticket = value
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True, help_text='Stripe Payment Intent ID')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    qr_code = models.ImageField(upload_to='tickets/qrcodes/', blank=True, null=True)
    verification_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    email_sent = models.BooleanField(default=False)
    last_email_sent = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Ticket Purchase'
        verbose_name_plural = 'Ticket Purchases'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.ticket_type.ticket_type.name if self.ticket_type else 'Unknown'} x{self.quantity} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        
        # Ensure we have a unique verification code for new instances
        if is_new and not self.verification_code:
            self.verification_code = uuid.uuid4()
        
        # Set total price if not set
        if not self.total_price and hasattr(self, 'event_ticket') and self.event_ticket:
            try:
                self.total_price = float(self.event_ticket.price) * int(self.quantity)
            except (AttributeError, TypeError, ValueError) as e:
                logger.error(f"Error calculating total price: {e}")
                # Set a default price if calculation fails
                self.total_price = 0
            
        # First save to ensure we have an ID
        super().save(*args, **kwargs)
        
        # Generate QR code if this is a new purchase or doesn't have one
        if not self.qr_code:
            self._generate_qr_code()
            
        # Send confirmation email for new confirmed purchases
        if is_new and self.status == 'confirmed' and not self.email_sent:
            self.send_confirmation_email()
    
    def _generate_qr_code(self):
        """Generate a QR code for this ticket purchase."""
        if self.qr_code:  # Skip if QR code already exists
            return False
            
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            # Include verification code in the QR code data
            ticket_data = f"ticket:{self.verification_code}"
            qr.add_data(ticket_data)
            qr.make(fit=True)
            
            # Create QR code image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Save to a buffer
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Save the QR code to the model
            filename = f'ticket_{self.verification_code}.png'
            self.qr_code.save(filename, File(buffer), save=True)
            
            # Clean up
            buffer.close()
            return True
            
        except Exception as e:
            logger.error(f"Error generating QR code for ticket {self.id}: {str(e)}")
            return False
    
    def mark_as_used(self):
        """Mark this ticket as used."""
        if self.status != 'used':
            self.status = 'used'
            self.save(update_fields=['status', 'updated_at'])
    
    def cancel(self, refund_amount=None, request=None):
        """
        Cancel this ticket purchase and update ticket availability.
        
        Args:
            refund_amount: Decimal amount to refund (if applicable)
            request: HttpRequest object (optional, used for building absolute URLs in emails)
            
        Returns:
            bool: True if cancellation was successful, False otherwise
        """
        if self.status in ['cancelled', 'refunded']:
            return False
            
        try:
            # Update ticket type availability
            if self.ticket_type.quantity_available is not None:
                self.ticket_type.quantity_available += self.quantity
                self.ticket_type.save(update_fields=['quantity_available'])
            
            # Update purchase status
            self.status = 'refunded' if refund_amount else 'cancelled'
            self.save(update_fields=['status', 'updated_at'])
            
            # Send cancellation email
            self.send_cancellation_email(refund_amount, request)
            
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling ticket {self.id}: {str(e)}")
            return False
    
    @property
    def is_refundable(self):
        """Check if this ticket purchase is eligible for a refund."""
        if self.status != 'confirmed':
            return False
            
        # Only allow refunds within 7 days of purchase
        refund_deadline = self.created_at + timezone.timedelta(days=7)
        return timezone.now() <= refund_deadline
        
    def send_confirmation_email(self, request=None):
        """
        Send a confirmation email for this ticket purchase.
        
        Args:
            request: HttpRequest object (optional, used for building absolute URLs)
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            from .utils.email_utils import send_ticket_email
            
            # Send the email using our utility function
            success = send_ticket_email(self, request)
            
            # Update email tracking fields if successful
            if success:
                self.email_sent = True
                self.last_email_sent = timezone.now()
                self.save(update_fields=['email_sent', 'last_email_sent'])
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending confirmation email for ticket {self.id}: {str(e)}")
            return False
    
    def send_cancellation_email(self, refund_amount=None, request=None):
        """
        Send a cancellation email for this ticket purchase.
        
        Args:
            refund_amount: Decimal amount being refunded (if applicable)
            request: HttpRequest object (optional, used for building absolute URLs)
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            from .utils.email_utils import send_ticket_email
            
            # Send the email using our utility function with is_cancellation=True
            success = send_ticket_email(self, request, is_cancellation=True, refund_amount=refund_amount)
            
            # Update email tracking fields if successful
            if success:
                self.last_email_sent = timezone.now()
                self.save(update_fields=['last_email_sent'])
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending cancellation email for ticket {self.id}: {str(e)}")
            return False
            
    def resend_confirmation_email(self, request=None):
        """
        Resend the confirmation email for this ticket purchase.
        
        Args:
            request: HttpRequest object (optional, used for building absolute URLs)
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        return self.send_confirmation_email(request)
