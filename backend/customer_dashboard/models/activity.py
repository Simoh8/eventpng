from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

User = get_user_model()

class UserActivity(models.Model):
    """
    Model to track user activities across the platform
    """
    class ActivityType(models.TextChoices):
        PHOTO_LIKE = 'photo_like', 'Photo Like'
        PHOTO_UNLIKE = 'photo_unlike', 'Photo Unlike'
        PHOTO_DOWNLOAD = 'photo_download', 'Photo Download'
        PHOTO_VIEW = 'photo_view', 'Photo View'
        GALLERY_VIEW = 'gallery_view', 'Gallery View'
        PURCHASE = 'purchase', 'Purchase'
        FAVORITE_ADD = 'favorite_add', 'Add to Favorites'
        FAVORITE_REMOVE = 'favorite_remove', 'Remove from Favorites'
        LOGIN = 'login', 'User Login'
        LOGOUT = 'logout', 'User Logout'

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='activities'
    )
    activity_type = models.CharField(
        max_length=50, 
        choices=ActivityType.choices
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Content type of the related object"
    )
    object_id = models.UUIDField(
        null=True, 
        blank=True,
        help_text="ID of the related object"
    )
    content_object = GenericForeignKey('content_type', 'object_id')
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data about the activity"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name_plural = 'User Activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_activity_type_display()} - {self.created_at}"

    @classmethod
    def record_activity(cls, user, activity_type, content_type=None, object_id=None, **metadata):
        """
        Helper method to record an activity
        """
        return cls.objects.create(
            user=user,
            activity_type=activity_type,
            content_type=content_type,
            object_id=object_id,
            metadata=metadata or {}
        )
