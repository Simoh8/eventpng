from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from django.db.models.signals import post_save

class UserManager(BaseUserManager):
    """Custom user model manager where email is the unique identifier."""
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    """Custom user model that uses email as the unique identifier."""
    username = None
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(_('full name'), max_length=255, blank=True)
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('User\'s contact phone number')
    )
    bio = models.TextField(
        _('bio'),
        blank=True,
        null=True,
        help_text=_('A short biography or description about the user')
    )
    is_photographer = models.BooleanField(
        _('photographer status'),
        default=False,
        help_text=_('Designates whether the user is a photographer who can upload photos.')
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    def __str__(self):
        try:
            if hasattr(self, 'email') and self.email:
                return str(self.email)
            if hasattr(self, 'username') and self.username:
                return str(self.username)
            if hasattr(self, 'id') and self.id:
                return f"user-{self.id}"
            return "[deleted user]"
        except Exception:
            return "[user]"
    
    @property
    def display_name(self):
        return self.full_name or self.email.split('@')[0]
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')


class NotificationPreference(models.Model):
    """Model to store user notification preferences."""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Email notifications
    email_notifications = models.BooleanField(
        _('email notifications'),
        default=True,
        help_text=_('Enable all email notifications')
    )
    
    # Specific notification types
    new_gallery_emails = models.BooleanField(
        _('new gallery notifications'),
        default=True,
        help_text=_('Receive emails when new galleries are added')
    )
    
    event_updates = models.BooleanField(
        _('event updates'),
        default=True,
        help_text=_('Receive emails about event updates')
    )
    
    marketing_emails = models.BooleanField(
        _('marketing emails'),
        default=True,
        help_text=_('Receive promotional emails and offers')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        try:
            user_identifier = ""
            if hasattr(self, 'user') and self.user:
                if hasattr(self.user, 'email') and self.user.email:
                    user_identifier = self.user.email
                elif hasattr(self.user, 'id'):
                    user_identifier = f"user {self.user.id}"
                else:
                    user_identifier = "[unknown user]"
            else:
                user_identifier = "[no user]"
            return f"Notification preferences for {user_identifier}"
        except Exception as e:
            return "Notification preferences [error]"
    
    class Meta:
        verbose_name = _('notification preference')
        verbose_name_plural = _('notification preferences')


@receiver(post_save, sender=CustomUser)
def create_user_notification_preferences(sender, instance, created, **kwargs):
    """Create notification preferences when a new user is created."""
    if created:
        NotificationPreference.objects.create(user=instance)
