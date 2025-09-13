from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import Gallery
from accounts.models import CustomUser

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
    
    # Skip if no users to notify
    if not users.exists():
        return
    
    # Prepare email content
    context = {
        'gallery': gallery,
        'event': gallery.event,
        'site_name': getattr(settings, 'SITE_NAME', 'EventPhoto'),
        'site_url': getattr(settings, 'SITE_URL', 'https://youreventphoto.com'),
    }
    
    # Render email template
    text_content = render_to_string('emails/new_gallery_notification.txt', context)
    html_content = render_to_string('emails/new_gallery_notification.html', context)
    
    # Send to each user
    for user in users:
        try:
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_content,
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send gallery notification to {user.email}: {str(e)}")

@receiver(post_save, sender=Gallery)
def handle_gallery_status_change(sender, instance, **kwargs):
    """
    Signal handler for gallery status changes
    Sends notification when a gallery is made public
    """
    if not instance.is_public:
        return
        
    # Check if this is an update and is_public was changed to True
    if instance.pk:
        try:
            old_instance = Gallery.objects.get(pk=instance.pk)
            if old_instance.is_public:  # Already public, no need to notify again
                return
        except Gallery.DoesNotExist:
            pass
    
    # Send notifications asynchronously to avoid blocking
    from django.core.mail import mail_admins
    
    try:
        send_gallery_notification(instance)
    except Exception as e:
        # Log the error but don't crash the request
        mail_admins(
            'Gallery Notification Error',
            f'Error sending gallery notifications: {str(e)}',
            fail_silently=True
        )
