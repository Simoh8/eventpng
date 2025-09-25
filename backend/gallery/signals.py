from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail, mail_admins
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
