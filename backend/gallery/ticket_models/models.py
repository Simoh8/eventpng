from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from model_utils import Choices
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

User = get_user_model()


class TicketGroup(models.Model):
    """
    Represents a group of ticket types (e.g., 'VIP', 'Business', 'Student').
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = _('Ticket Group')
        verbose_name_plural = _('Ticket Groups')

    def __str__(self):
        return self.name


class TicketLevel(models.Model):
    """
    Represents a ticket level (e.g., 'Regular', 'VIP', 'VVIP').
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = _('Ticket Level')
        verbose_name_plural = _('Ticket Levels')

    def __str__(self):
        return self.name


class TicketType(models.Model):
    """
    Represents a specific type of ticket, combining group and level.
    """
    name = models.CharField(max_length=100, help_text="Display name for this ticket type")
    group = models.ForeignKey(
        TicketGroup,
        on_delete=models.PROTECT,
        related_name='ticket_types',
        help_text="Group this ticket type belongs to"
    )
    level = models.ForeignKey(
        TicketLevel,
        on_delete=models.PROTECT,
        related_name='ticket_types',
        help_text="Level of this ticket type"
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['group__name', 'level__display_order', 'name']
        unique_together = [['group', 'level', 'name']]
        verbose_name = _('Ticket Type')
        verbose_name_plural = _('Ticket Types')

    def __str__(self):
        return f"{self.group} - {self.level} - {self.name}"

    def full_name(self):
        return f"{self.group} {self.level} - {self.name}"


class EventTicket(models.Model):
    """Links events to specific ticket types with pricing and availability."""
    event = models.ForeignKey(
        'gallery.Event',
        on_delete=models.CASCADE,
        related_name='event_tickets'
    )
    ticket_type = models.ForeignKey(
        TicketType,
        on_delete=models.PROTECT,
        related_name='event_tickets'
    )
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar ($)'),
        ('EUR', 'Euro (€)'),
        ('GBP', 'British Pound (£)'),
        ('KES', 'Kenyan Shilling (KSh)'),
        ('UGX', 'Ugandan Shilling (USh)'),
        ('TZS', 'Tanzanian Shilling (TSh)'),
    ]
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price in the selected currency"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='USD',
        help_text="Currency for this ticket price"
    )
    quantity_available = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of tickets available. Leave empty for unlimited."
    )
    sale_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales start. Leave empty to start immediately."
    )
    sale_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales end. Leave empty for no end date."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this ticket type is currently available for purchase"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('event', 'ticket_type')
        ordering = ['ticket_type__group__name', 'ticket_type__level__display_order']
        verbose_name = _('Event Ticket')
        verbose_name_plural = _('Event Tickets')

    def __str__(self):
        return f"{self.event.name} - {self.ticket_type}"
        
    @property
    def price_with_currency(self):
        """Return price formatted with currency symbol"""
        currency_symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'KES': 'KSh',
            'UGX': 'USh',
            'TZS': 'TSh',
        }
        symbol = currency_symbols.get(self.currency, self.currency)
        return f"{symbol} {self.price:.2f}"

    @property
    def name(self):
        return f"{self.ticket_type.group.name} - {self.ticket_type.level.name}"

    @property
    def group(self):
        return self.ticket_type.group

    @property
    def level(self):
        return self.ticket_type.level

    @property
    def remaining_quantity(self):
        if self.quantity_available is None:
            return None
        
        # Get the related Ticket model from the main app
        from gallery.models import EventRegistration
        
        # Find the corresponding Ticket in the main app
        from gallery.models import Ticket as MainTicket
        try:
            main_ticket = MainTicket.objects.get(
                event_id=self.event.id,
                name=self.ticket_type.name,
                price=self.price
            )
            # Get count of registrations for this ticket type
            sold = EventRegistration.objects.filter(
                ticket=main_ticket,
                status__in=['confirmed', 'attended']
            ).count()
            return max(0, self.quantity_available - sold)
        except MainTicket.DoesNotExist:
            # If no corresponding ticket exists, return the full quantity
            return self.quantity_available

    def is_available(self):
        """Check if this ticket is currently available for purchase."""
        if not self.is_active:
            return False
            
        now = timezone.now()
        if self.sale_start and now < self.sale_start:
            return False
            
        if self.sale_end and now > self.sale_end:
            return False
            
        if self.quantity_available is not None and self.remaining_quantity <= 0:
            return False
            
        return True
