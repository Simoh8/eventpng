import os
import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
from django.core.files.base import ContentFile
from io import BytesIO
import qrcode
from qrcode.image.svg import SvgPathImage

logger = logging.getLogger(__name__)

def generate_qr_code(ticket, request=None):
    """
    Generate a QR code for the ticket
    
    Args:
        ticket: TicketPurchase instance
        request: HttpRequest object (optional, used for building absolute URLs)
        
    Returns:
        ContentFile: The QR code image file
        str: The QR code data URL (for embedding in HTML emails)
    """
    try:
        # Create the verification URL
        if request is not None:
            # Use the request to build an absolute URL
            current_site = get_current_site(request)
            verification_url = f"{request.scheme}://{current_site.domain}{reverse('tickets:verify-ticket', args=[ticket.verification_code])}"
        else:
            # Fallback to a relative URL if no request is provided
            verification_url = reverse('tickets:verify-ticket', args=[ticket.verification_code])
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        
        # Create an in-memory file for the QR code
        img_io = BytesIO()
        
        # Save as SVG for better quality in emails
        factory = qrcode.image.svg.SvgPathImage
        img = qr.make_image(image_factory=factory)
        img.save(img_io, format='SVG')
        
        # Create a ContentFile from the image data
        img_file = ContentFile(img_io.getvalue())
        
        # Generate a filename for the QR code
        filename = f'ticket_qr_{ticket.id}.svg'
        
        return img_file, filename, f"data:image/svg+xml;base64,{img_io.getvalue().decode('utf-8')}"
        
    except Exception as e:
        logger.error(f"Error generating QR code for ticket {ticket.id}: {str(e)}")
        return None, None, None

def send_ticket_email(ticket, request=None, is_cancellation=False, refund_amount=None):
    """
    Send a ticket confirmation or cancellation email
    
    Args:
        ticket: TicketPurchase instance
        request: HttpRequest object (optional, used for building absolute URLs)
        is_cancellation: Boolean indicating if this is a cancellation email
        refund_amount: Decimal amount being refunded (for cancellations)
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Get the event and ticket type
        event = ticket.event
        ticket_type = ticket.ticket_type
        
        # Build the ticket URL
        if request is not None:
            current_site = get_current_site(request)
            ticket_url = f"{request.scheme}://{current_site.domain}{reverse('tickets:user-ticket-detail', args=[ticket.id])}"
        else:
            ticket_url = reverse('tickets:user-ticket-detail', args=[ticket.id])
        
        # Prepare email context
        context = {
            'ticket': ticket,
            'event': event,
            'ticket_type': ticket_type,
            'ticket_url': ticket_url,
            'settings': settings,
        }
        
        # Add refund amount for cancellation emails
        if is_cancellation:
            context['refund_amount'] = refund_amount
        
        # Render email templates
        subject = f"Your Ticket for {event.title}" if not is_cancellation else f"Ticket Cancellation: {event.title}"
        text_template = 'emails/ticket_cancellation.txt' if is_cancellation else 'emails/ticket_confirmation.txt'
        html_template = 'emails/ticket_cancellation.html' if is_cancellation else 'emails/ticket_confirmation.html'
        
        text_content = render_to_string(text_template, context)
        html_content = render_to_string(html_template, context)
        
        # Create email
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        to_email = ticket.user.email
        
        # Generate QR code if this is a confirmation email
        attachments = []
        if not is_cancellation:
            qr_file, qr_filename, qr_data_url = generate_qr_code(ticket, request)
            if qr_file:
                # Save QR code to ticket model if it has a qr_code field
                if hasattr(ticket, 'qr_code'):
                    ticket.qr_code.save(qr_filename, qr_file, save=True)
                
                # Add QR code as an inline attachment for the email
                attachments.append((qr_filename, qr_file.read(), 'image/svg+xml'))
        
        # Send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email],
            reply_to=[getattr(settings, 'DEFAULT_REPLY_TO_EMAIL', from_email)],
        )
        
        # Attach HTML content
        email.attach_alternative(html_content, "text/html")
        
        # Attach QR code if available
        for filename, content, mimetype in attachments:
            email.attach(filename, content, mimetype)
        
        # Send the email
        email.send(fail_silently=False)
        
        # Log successful email sending
        logger.info(f"Successfully sent {'cancellation' if is_cancellation else 'confirmation'} "
                   f"email for ticket {ticket.id} to {to_email}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error sending {'cancellation' if is_cancellation else 'confirmation'} "
                   f"email for ticket {ticket.id}: {str(e)}", exc_info=True)
        return False
