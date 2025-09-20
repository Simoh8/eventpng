from django.db import models
from django.conf import settings
from customer_dashboard.models import Photo  # Assuming Photo model exists in customer_dashboard/models/__init__.py

class PhotoLike(models.Model):
    """
    Model to track user likes on photos
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='photo_likes'
    )
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'photo')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} likes {self.photo.id}"
