import os
import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator


def get_upload_path(instance, filename):
    """Generate a path for uploaded files.
    
    Format: gallery/{gallery_slug}/{filename}
    """
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('gallery', instance.gallery.slug, filename)


class Gallery(models.Model):
    """
    Represents a collection of photos.
    """
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
