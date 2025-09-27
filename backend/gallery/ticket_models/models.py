from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from model_utils import Choices
from django.core.validators import MinValueValidator, MaxValueValidator


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

    @property
    def full_name(self):
        return f"{self.group} {self.level} - {self.name}"


class EventTicket(models.Model):
    """
    Links events to specific ticket types with pricing and availability.
    """
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
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price in USD"
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
        ordering = ['ticket_type__group__name', 'ticket_type__level__display_order']
        unique_together = [['event', 'ticket_type']]
        verbose_name = _('Event Ticket')
        verbose_name_plural = _('Event Tickets')

    def __str__(self):
        return f"{self.event.name} - {self.ticket_type} - {self.remaining_quantity if self.remaining_quantity is not None else 'Unlimited'} available"

    @property
    def name(self):
        return self.ticket_type.name

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
        # Use the related_name 'registrations' which we'll set up in the model field
        # If no registrations exist yet, this will be 0
        sold = getattr(self, 'registrations', None) and self.registrations.filter(status='confirmed').count() or 0
        return max(0, self.quantity_available - sold)

    @property
    def is_available(self):
        """Check if this ticket is currently available for purchase."""
        if not self.is_active:
            return False
            
        now = timezone.now()
        if self.sale_start and now < self.sale_start:
            return False
        if self.sale_end and now > self.sale_end:
            return False
            
        if self.quantity_available is not None:
            return self.remaining_quantity > 0
            
        return True
