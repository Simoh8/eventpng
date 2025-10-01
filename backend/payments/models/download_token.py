import uuid
from django.db import models

class DownloadToken(models.Model):
    """
    Token that grants temporary access to download purchased photos.
    """
    token = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        'payments.Order',
        on_delete=models.CASCADE,
        related_name='download_tokens'
    )
    photo = models.ForeignKey(
        'gallery.Photo',
        on_delete=models.CASCADE,
        related_name='download_tokens'
    )
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Token {self.token} - {self.photo.title if hasattr(self.photo, 'title') else 'Unknown'}"
    
    def is_valid(self):
        """Check if the token is still valid and not used."""
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()
    
    def mark_as_used(self):
        """Mark the token as used."""
        from django.utils import timezone
        if not self.is_used:
            self.is_used = True
            self.used_at = timezone.now()
            self.save(update_fields=['is_used', 'used_at'])
