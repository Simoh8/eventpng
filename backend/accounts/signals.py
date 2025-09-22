from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

def send_welcome_email(user, is_photographer=False):
    """
    Send a welcome email to the new user based on their type
    """
    subject = 'Welcome to EventPhoto - Your Account Has Been Created!'
    
    # Choose the appropriate template based on user type
    template = 'emails/photographer_welcome.html' if is_photographer else 'emails/customer_welcome.html'
    
    # Get the frontend URL, fallback to SITE_URL if FRONTEND_URL is not set
    frontend_url = getattr(settings, 'FRONTEND_URL', getattr(settings, 'SITE_URL', 'https://youreventphoto.com'))
    
    context = {
        'user': user,
        'site_name': 'EventPhoto',
        'contact_email': settings.DEFAULT_FROM_EMAIL,
        'site_url': frontend_url.rstrip('/'),  # Remove trailing slash for consistency
    }
    
    html_message = render_to_string(template, context)
    
    send_mail(
        subject=subject,
        message='',  # Text version will be auto-generated from HTML
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )

@receiver(post_save, sender=User)
def send_welcome_email_on_signup(sender, instance, created, **kwargs):
    """
    Signal to send welcome email when a new user is created
    """
    if created and not instance.is_superuser:  # Don't send for superusers
        # Check if this is a photographer or regular customer
        is_photographer = hasattr(instance, 'is_photographer') and instance.is_photographer
        send_welcome_email(instance, is_photographer=is_photographer)
