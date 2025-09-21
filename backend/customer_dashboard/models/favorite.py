from django.db import models
from django.conf import settings

class Favorite(models.Model):
    """
    Model to track user's favorite photos
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    
    photo = models.ForeignKey(
        'gallery.Photo',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'photo')
        ordering = ['-created_at']
        verbose_name = 'Favorite'
        verbose_name_plural = 'Favorites'
    
    def __str__(self):
        return f"{self.user.email} - {self.photo.title}"
