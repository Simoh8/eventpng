from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.urls import reverse
from django.utils import timezone

def send_ticket_confirmation_email(ticket_purchase, request=None):
    """
    Send a confirmation email for a ticket purchase.
    
    Args:
        ticket_purchase: The TicketPurchase instance
        request: The HTTP request (optional, used for building absolute URLs)
    """
    # Get the absolute URL for the ticket detail page
    ticket_url = None
    if request:
        ticket_url = request.build_absolute_uri(
            reverse('ticket-detail', kwargs={'pk': str(ticket_purchase.id)})
        )
    
    # Prepare email context
    context = {
        'ticket': ticket_purchase,
        'event': ticket_purchase.ticket_type.event,
        'ticket_type': ticket_purchase.ticket_type,
        'ticket_url': ticket_url,
        'now': timezone.now(),
    }
    
    # Render email content
    subject = f"Your Ticket Confirmation - {ticket_purchase.ticket_type.event.title}"
    text_content = render_to_string('emails/ticket_confirmation.txt', context)
    html_content = render_to_string('emails/ticket_confirmation.html', context)
    
    # Create and send email
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = ticket_purchase.user.email
    
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    
    # Attach QR code if it exists
    if ticket_purchase.qr_code:
        msg.attach_file(ticket_purchase.qr_code.path)
    
    msg.send(fail_silently=False)


def send_ticket_cancellation_email(ticket_purchase, request=None):
    """
    Send an email notification when a ticket is cancelled.
    """
    context = {
        'ticket': ticket_purchase,
        'event': ticket_purchase.ticket_type.event,
        'ticket_type': ticket_purchase.ticket_type,
        'now': timezone.now(),
    }
    
    subject = f"Ticket Cancellation - {ticket_purchase.ticket_type.event.title}"
    text_content = render_to_string('emails/ticket_cancellation.txt', context)
    html_content = render_to_string('emails/ticket_cancellation.html', context)
    
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = ticket_purchase.user.email
    
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=False)
