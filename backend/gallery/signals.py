from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail, mail_admins
from django.template.loader import render_to_string
from django.db import transaction
from django.utils import timezone
from .models import Gallery, Event
from accounts.models import CustomUser


@receiver(pre_save, sender=Event)
def check_ticket_status_change(sender, instance, **kwargs):
    """
    Track if has_tickets field is being changed on an Event
    """
    if instance.pk:
        try:
            old_instance = Event.objects.get(pk=instance.pk)
            if old_instance.has_tickets != instance.has_tickets:
                instance._has_tickets_changed = True
        except Event.DoesNotExist:
            pass

@receiver(post_save, sender=Event)
def create_default_ticket(sender, instance, created, **kwargs):
    """
    Create a default ticket for events with has_tickets=True
    """
    from .ticket_models.models import TicketType, EventTicket
    
    # Only proceed if this is a new event with has_tickets=True or has_tickets was just enabled
    if not (created and instance.has_tickets) and \
       not (hasattr(instance, '_has_tickets_changed') and instance._has_tickets_changed):
        return
    
    # Check if a default ticket already exists
    if hasattr(instance, 'tickets') and instance.tickets.exists():
        return
    
    # Use transaction.on_commit to ensure this runs after the transaction is committed
    transaction.on_commit(lambda: _create_default_ticket(instance))

def _create_default_ticket(event):
    """Helper function to create a default ticket for an event"""
    from .ticket_models.models import TicketType, EventTicket
    
    try:
        # Try to get a default ticket type, create one if it doesn't exist
        ticket_type, _ = TicketType.objects.get_or_create(
            name='General Admission',
            defaults={
                'description': 'General admission ticket',
                'is_active': True
            }
        )
        
        # Create the default ticket
        EventTicket.objects.create(
            event=event,
            ticket_type=ticket_type,
            price=0.00,  # Default to free
            quantity_available=100,  # Default quantity
            is_active=True,
            sale_start=timezone.now(),
            sale_end=event.date  # Default to event date
        )
    except Exception as e:
        # Log the error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create default ticket for event {event.id}: {str(e)}")

def send_gallery_notification(gallery):
    """
    Send notification to all users about a new gallery
    """
    subject = f'New Gallery Available: {gallery.title}'

    # Get all active users who should receive notifications
    users = CustomUser.objects.filter(
        is_active=True,
        notification_preferences__new_gallery_emails=True
    ).distinct()

    if not users.exists():
        return

    # Prepare email content
    context = {
        'gallery': gallery,
        'event': gallery.event,
        'site_name': 'EvenPng',  # Fixed site name
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://eventpng.com'),  # Frontend URL
        'site_url': getattr(settings, 'SITE_URL', 'https://eventpng.com'),  # Keep for backward compatibility
    }

    html_content = render_to_string('emails/new_gallery_notification.html', context)

    # Send to each user
    for user in users:
        try:
            send_mail(
                subject=subject,
                message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_content,
                fail_silently=True,  # suppress crashes in production
            )
        except Exception as e:
            mail_admins(
                subject=f"Failed to send gallery notification to {user.email}",
                message=f"Error: {str(e)}",
                fail_silently=True
            )


@receiver(post_save, sender=Gallery)
def handle_gallery_status_change(sender, instance, created, **kwargs):
    """
    Signal handler for gallery status changes
    Sends notification when a gallery is made public or when a new public gallery is created
    """
    if not instance.is_public:
        return

    # Only notify when a gallery is first created public,
    # or when an existing one is changed to public
    if not created and not instance.tracker.has_changed('is_public'):
        return

    # Extra safety check (if tracker missed it)
    if not created:
        try:
            old_instance = Gallery.objects.get(pk=instance.pk)
            if old_instance.is_public:
                return
        except Gallery.DoesNotExist:
            pass

    # Trigger notifications
    try:
        send_gallery_notification(instance)
    except Exception as e:
        mail_admins(
            subject=f"Failed to send gallery notification for {instance.title}",
            message=f"Error: {str(e)}",
            fail_silently=True
        )
