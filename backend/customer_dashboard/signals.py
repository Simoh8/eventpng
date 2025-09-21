from django.db.models.signals import post_save
from django.dispatch import receiver
from gallery.models import Download as GalleryDownload
from .models import CustomerProfile

@receiver(post_save, sender=GalleryDownload)
def update_customer_download_count(sender, instance, created, **kwargs):
    """
    Update the customer's download count when a new download is recorded.
    """
    if created and instance.user:
        # Get or create the customer profile
        profile, _ = CustomerProfile.objects.get_or_create(user=instance.user)
        
        # Update the download count
        profile.total_downloads = GalleryDownload.objects.filter(user=instance.user).count()
        profile.save(update_fields=['total_downloads'])

# Connect the signal
post_save.connect(update_customer_download_count, sender=GalleryDownload)
