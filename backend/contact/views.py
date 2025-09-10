import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import AllowAny
from .models import ContactSubmission
from .serializers import ContactSubmissionSerializer
from .authentication import ContactFormAuthentication

# Set up logging
logger = logging.getLogger(__name__)

class ContactFormView(APIView):
    """
    API endpoint that handles contact form submissions.
    """
    authentication_classes = [ContactFormAuthentication]
    permission_classes = [AllowAny]
    
    def post(self, request, format=None):
        # Log the incoming request data and headers for debugging
        logger.info(f"Received contact form data: {request.data}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"User: {request.user}")
        logger.info(f"User authenticated: {request.user.is_authenticated}")
        
        # Check authentication status
        if not request.user.is_authenticated:
            logger.info("User is not authenticated, but that's okay for this endpoint")
        
        serializer = ContactSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Save the submission
            contact = serializer.save()
            
            # Send email notification (if email is configured)
            email_sent = False
            if all([settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD]):
                email_sent = self._send_notification_email(contact)
            
            response_data = {
                "message": "Thank you for your inquiry. We'll get back to you soon!",
                "email_sent": email_sent
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error processing contact form: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while processing your request. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_notification_email(self, contact):
        """Send email notification to admin about new contact form submission."""
        try:
            from django.contrib.sites.shortcuts import get_current_site
            from django.conf import settings
            
            current_site = get_current_site(None)
            subject = f"[Bulk Download] New Contact Form: {contact.subject}"
            
            # Create HTML email context
            context = {
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone_number,  # phone_number already includes country code
                'message': contact.message,
                'submitted_at': contact.submitted_at,
                'subject': contact.subject,
                'site_name': getattr(settings, 'SITE_NAME', current_site.name),
                'site_domain': getattr(settings, 'SITE_DOMAIN', current_site.domain),
            }
            
            html_message = render_to_string('emails/contact_notification.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_EMAIL],
                html_message=html_message,
                fail_silently=False,  
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to send contact email: {str(e)}", exc_info=True)
            return False
