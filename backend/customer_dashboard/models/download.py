from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

from gallery.models import Photo


class Download(models.Model):
    """
    Model to track photo downloads by users
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_downloads'  # Changed from 'downloads' to 'customer_downloads'
    )
    
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='customer_downloads'  # Changed from 'downloads' to 'customer_downloads'
    )
    
    downloaded_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    download_count = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    is_active = models.BooleanField(default=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Download'
        verbose_name_plural = 'Downloads'
        ordering = ['-downloaded_at']
        unique_together = ['user', 'photo']
    
    def __str__(self):
        return f"{self.user.email} - {self.photo.title}"
    
    def save(self, *args, **kwargs):
        # Set default expiration (30 days from now)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=30)
        
        # Increment download count if this is an update
        if self.pk:
            self.download_count += 1
        
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if the download link has expired"""
        return timezone.now() > self.expires_at
    
    @classmethod
    def get_or_create_download(cls, user, photo, **kwargs):
        """
        Get or create a download record for the user and photo
        """
        download, created = cls.objects.get_or_create(
            user=user,
            photo=photo,
            defaults={
                'expires_at': timezone.now() + timezone.timedelta(days=30),
                **kwargs
            }
        )
        
        if not created:
            # Update the existing download
            download.download_count += 1
            download.is_active = True
            
            # Update any provided fields
            for key, value in kwargs.items():
                setattr(download, key, value)
                
            download.save()
        
        return download, created
