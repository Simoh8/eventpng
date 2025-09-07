import os
import uuid
import random
import string
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_save
from django.dispatch import receiver

def generate_pin():
    """Generate a random 6-digit PIN."""
    return ''.join(random.choices(string.digits, k=6))


def get_upload_path(instance, filename):
    """Generate a path for uploaded files.
    
    Format: gallery/{gallery_slug}/{filename}
    """
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('gallery', instance.gallery.slug, filename)


class Event(models.Model):
    """
    Represents an event that can contain multiple galleries.
    """
    PRIVACY_CHOICES = [
        ('public', 'Public - Anyone can view'),
        ('private', 'Private - Requires PIN to view')
    ]
    
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    date = models.DateField()
    location = models.CharField(max_length=255, blank=True)
    privacy = models.CharField(
        max_length=10,
        choices=PRIVACY_CHOICES,
        default='public',
        help_text="Control who can view this event's galleries"
    )
    pin = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="PIN code for private events (auto-generated for private events)",
        editable=False
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_events',
        limit_choices_to={'is_staff': True}  # Only staff can create events
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'name']

    def __str__(self):
        return self.name
        
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            
            # Ensure slug is unique
            original_slug = self.slug
            counter = 1
            while Event.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
                
        # Generate PIN for private events if not set
        if self.privacy == 'private' and not self.pin:
            self.pin = generate_pin()
        elif self.privacy == 'public':
            self.pin = None
                
        super().save(*args, **kwargs)
        
    @property
    def cover_images(self):
        """Return all cover images for this event, ordered by display order."""
        return self.covers.all().order_by('order')
        
    @property
    def primary_cover(self):
        """Return the primary cover image or first available."""
        return self.covers.filter(is_primary=True).first() or self.covers.first()


class EventCoverImage(models.Model):
    """
    Represents a cover image for an event.
    An event can have multiple cover images that can be displayed in a slideshow.
    """
    def get_upload_path(instance, filename):
        """Generate a path for event cover images."""
        ext = filename.split('.')[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        return os.path.join('events', 'covers', str(instance.event.id), filename)
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='covers',
        help_text="Event this cover image belongs to"
    )
    image = models.ImageField(
        upload_to=get_upload_path,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(
        default=False,
        help_text="If True, this will be the default cover image for the event"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the cover images should be displayed"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Event Cover Image'
        verbose_name_plural = 'Event Cover Images'
    
    def __str__(self):
        return f"Cover for {self.event.name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary cover per event
        if self.is_primary:
            EventCoverImage.objects.filter(event=self.event, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class Gallery(models.Model):
    """
    Represents a collection of photos for an event.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='galleries',
        null=True,
        blank=True,
        help_text="Event this gallery belongs to"
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    photographer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='galleries',
        limit_choices_to={'is_photographer': True}
    )
    is_public = models.BooleanField(
        default=False,
        help_text="If True, gallery is visible to everyone. If False, only accessible via direct link."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If False, gallery is hidden from everyone including the photographer."
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Price in USD for downloading the entire gallery. 0 means free."
    )
    cover_photo = models.ForeignKey(
        'Photo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cover_for_galleries'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'galleries'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            # Ensure slug is unique
            original_slug = self.slug
            counter = 1
            while Gallery.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    @property
    def photo_count(self):
        return self.photos.count()


class Photo(models.Model):
    """
    Represents a single photo in a gallery.
    """
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    image = models.ImageField(
        upload_to=get_upload_path,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    width = models.PositiveIntegerField(editable=False, null=True)
    height = models.PositiveIntegerField(editable=False, null=True)
    file_size = models.PositiveBigIntegerField(editable=False, null=True)
    mime_type = models.CharField(max_length=100, editable=False, blank=True)
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(
        default=True,
        help_text="If False, photo is hidden from everyone except the photographer."
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title or f"Photo {self.id}"

    def save(self, *args, **kwargs):
        # Set title to filename without extension if not provided
        if not self.title and self.image:
            self.title = os.path.splitext(os.path.basename(self.image.name))[0]
        
        # Update file info
        if self.image:
            self.file_size = self.image.size
            self.mime_type = getattr(self.image.file, 'content_type', '')
            
            # Get image dimensions
            try:
                from PIL import Image
                with Image.open(self.image) as img:
                    self.width, self.height = img.size
            except:
                pass
        
        super().save(*args, **kwargs)
        
        # If this is the first photo in the gallery, set it as the cover
        if self.gallery and not self.gallery.cover_photo:
            self.gallery.cover_photo = self
            self.gallery.save(update_fields=['cover_photo'])


class Download(models.Model):
    """
    Tracks photo downloads by users.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='downloads'
    )
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='downloads'
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-downloaded_at']
        unique_together = ['user', 'photo']

    def __str__(self):
        return f"{self.user} downloaded {self.photo}"
