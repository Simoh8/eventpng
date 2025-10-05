import os
import uuid
import random
import string
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.files.storage import default_storage
from model_utils import FieldTracker

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
    
    TICKET_TYPES = [
        ('free', 'Free - No ticket required'),
        ('paid', 'Paid - Requires ticket purchase'),
        ('rsvp', 'RSVP - Free but requires registration')
    ]
    
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar ($)'),
        ('EUR', 'Euro (€)'),
        ('GBP', 'British Pound (£)'),
        ('NGN', 'Nigerian Naira (₦)'),
        ('KES', 'Kenyan Shilling (KSh)'),
        ('GHS', 'Ghanaian Cedi (GH₵)'),
        ('ZAR', 'South African Rand (R)'),
        ('INR', 'Indian Rupee (₹)'),
        ('AUD', 'Australian Dollar (A$)'),
        ('CAD', 'Canadian Dollar (C$)'),
    ]
    
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    date = models.DateField()
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="End date for multi-day events"
    )
    location = models.CharField(max_length=255, blank=True)
    privacy = models.CharField(
        max_length=10,
        choices=PRIVACY_CHOICES,
        default='public',
        help_text="Control who can view this event's galleries"
    )
    has_tickets = models.BooleanField(
        default=False,
        help_text="Check if this event requires tickets"
    )
    ticket_type = models.CharField(
        max_length=10,
        choices=TICKET_TYPES,
        default='free',
        help_text="Type of ticketing for this event"
    )
    max_attendees = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of attendees (for RSVP/paid events)"
    )
    pin = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="PIN code for private events (auto-generated for private events)",
        editable=False
    )
    
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='USD',
        help_text="Currency for this event's ticket prices"
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
        return str(self.name) if self.name is not None else f"Event {self.id}"
        
    def save(self, *args, **kwargs):
        # Track if has_tickets is being changed
        has_tickets_changed = False
        if not self._state.adding:
            try:
                old_instance = Event.objects.get(pk=self.pk)
                has_tickets_changed = (old_instance.has_tickets != self.has_tickets)
                if has_tickets_changed:
                    self._has_tickets_changed = True
            except Event.DoesNotExist:
                pass
        
        # Generate slug from name if not provided
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure slug is unique
            if Event.objects.filter(slug=self.slug).exclude(pk=self.pk if self.pk else None).exists():
                self.slug = f"{self.slug}-{self.date.strftime('%Y%m%d')}"
                
        # Set end date to match start date if not provided
        if not self.end_date:
            self.end_date = self.date
            
        # If this is a private event, generate a PIN if not set
        if self.privacy == 'private' and not self.pin:
            self.pin = generate_pin()
        
        # Save the event
        super().save(*args, **kwargs)
        
        # Schedule ticket creation after the transaction is committed
        if getattr(self, '_has_tickets_changed', False) or (self.has_tickets and has_tickets_changed):
            from django.db import transaction
            transaction.on_commit(lambda: self._create_default_ticket() if self.has_tickets else None)
    
    def _create_default_ticket(self):
        """Create a default ticket for the event."""
        from .ticket_models.models import TicketType, EventTicket
        
        # Check if a default ticket already exists
        if hasattr(self, 'tickets') and self.tickets.exists():
            return
            
        try:
            # Try to get a default ticket type, create one if it doesn't exist
            try:
                ticket_type = TicketType.objects.get(name='General Admission')
            except TicketType.DoesNotExist:
                # Create a default ticket type if it doesn't exist
                ticket_type = TicketType.objects.create(
                    name='General Admission',
                    description='General admission ticket',
                    is_active=True
                )
            
            # Create the default ticket
            EventTicket.objects.create(
                event=self,
                ticket_type=ticket_type,
                price=0.00,  # Default to free
                quantity_available=100,  # Default quantity
                is_active=True,
                sale_start=timezone.now(),
                sale_end=self.date  # Default to event date
            )
        except Exception as e:
            # Log the error but don't fail the event save
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create default ticket for event {self.id}: {str(e)}")
    
    def cover_images(self):
        """Return all cover images for this event, ordered by display order."""
        return self.covers.all().order_by('order')
        
    @property
    def requires_pin(self):
        """Check if this event requires a PIN for access."""
        return self.privacy == 'private' and self.pin is not None
        
    def primary_cover(self):
        """Return the primary cover image or first available."""
        return self.covers.filter(is_primary=True).first() or self.covers.first()
        
    @property
    def cover_image_url(self):
        """Return the URL of the primary cover image if available."""
        primary_cover = self.covers.filter(is_primary=True).first()
        if primary_cover and hasattr(primary_cover.image, 'url'):
            return primary_cover.image.url
        
        # Fallback to first cover image if no primary is set
        first_cover = self.covers.first()
        if first_cover and hasattr(first_cover.image, 'url'):
            return first_cover.image.url
            
        # Return a placeholder if no covers are available
        return '/static/images/event-placeholder.jpg'


class Ticket(models.Model):
    """
    Represents a ticket type for an event.
    """
    event = models.ForeignKey(
        'Event',
        on_delete=models.CASCADE,
        related_name='tickets'
    )
    name = models.CharField(
        max_length=100,
        help_text="Name of the ticket type (e.g., 'General Admission', 'VIP')"
    )
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Price in the selected currency. Set to 0 for free tickets."
    )
    
    currency = models.CharField(
        max_length=3,
        choices=Event.CURRENCY_CHOICES,
        default='USD',
        help_text="Currency for this ticket. Defaults to the event's currency."
    )
    quantity_available = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of tickets available. Leave empty for unlimited."
    )
    sale_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales start. Leave empty to start immediately."
    )
    sale_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales end. Leave empty for no end date."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this ticket type is currently available for purchase"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price', 'name']

    def __str__(self):
        return f"{self.name} - {self.event.name}"

    @property
    def is_available(self):
        """Check if this ticket is currently available for purchase."""
        if not self.is_active:
            return False
            
        now = timezone.now()
        if self.sale_start and now < self.sale_start:
            return False
        if self.sale_end and now > self.sale_end:
            return False
            
        if self.quantity_available is not None:
            return self.quantity_available > self.registrations.count()
            
        return True

    @property
    def remaining_quantity(self):
        """Return the number of tickets remaining."""
        if self.quantity_available is None:
            return None
        return max(0, self.quantity_available - self.registrations.count())


class EventRegistration(models.Model):
    """
    Tracks event registrations/ticket sales.
    
    This model stores information about users who have registered for an event,
    including their ticket details, payment status, and check-in information.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('attended', 'Attended'),
        ('no_show', 'No Show')
    ]
    
    event = models.ForeignKey(
        'Event',
        on_delete=models.CASCADE,
        related_name='registrations'
    )
    ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.SET_NULL,
        null=True,
        related_name='registrations'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='event_registrations'
    )
    email = models.EmailField(help_text="Email address for the attendee")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    registration_date = models.DateTimeField(auto_now_add=True)
    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Store payment information if this was a paid ticket
    payment = models.ForeignKey(
        'Payment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='event_registrations'
    )
    
    class Meta:
        ordering = ['-registration_date']
        verbose_name = 'Event Registration'
        verbose_name_plural = 'Event Registrations'
        
    def __str__(self):
        """Return a string representation of the registration."""
        ticket_name = self.ticket.name if self.ticket else 'No Ticket'
        return f"{self.first_name} {self.last_name} - {ticket_name} - {self.event}"


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
        storage=default_storage,
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
        default=True,
        help_text="If True, gallery is visible to everyone. If False, only accessible via direct link.",
        null=False,
        blank=True
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
    featured_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="If set, the gallery will be featured until this date"
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
        return str(self.title) if self.title is not None else f"Gallery {self.id}"

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

    def _get_photo_count(self):
        if hasattr(self, '_photo_count'):
            return self._photo_count
        return self.photos.count()
        
    def _set_photo_count(self, value):
        # This is a no-op setter to handle cases where Django tries to set the attribute
        pass
        
    photo_count = property(_get_photo_count, _set_photo_count)
    
    # Track changes to is_public field for notifications
    tracker = FieldTracker(fields=['is_public'])


class Photo(models.Model):
    """
    Represents a single photo in a gallery.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_photos',
        help_text="User who uploaded this photo"
    )
    image = models.ImageField(
        upload_to=get_upload_path,
        storage=default_storage,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Price in USD for downloading this photo. 0 means free."
    )
    is_purchasable = models.BooleanField(
        default=True,
        help_text="If True, this photo can be purchased separately"
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
    like_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of likes for this photo"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return str(self.title) if self.title is not None and self.title.strip() else f"Photo {self.id}"

    def save(self, *args, **kwargs):
        """Save the photo and extract metadata."""
        if not self.pk:  # Only on creation
            # Generate a unique filename if needed
            if not self.image.name:
                ext = os.path.splitext(self.image.name)[1]
                self.image.name = f"{uuid.uuid4()}{ext}"
            
            # Extract and save image metadata
            try:
                with Image.open(self.image) as img:
                    self.width, self.height = img.size
                    self.mime_type = Image.MIME.get(img.format, '')
                    
                    # Get file size
                    if hasattr(self.image, 'size'):
                        self.file_size = self.image.size
                    elif hasattr(self.image, 'file') and hasattr(self.image.file, 'size'):
                        self.file_size = self.image.file.size
            except Exception as e:
                # If there's an error processing the image, still save the model
                pass
        
        super().save(*args, **kwargs)
        
    def serve_protected_image(self, request):
        """Serve the image with security headers to prevent hotlinking and downloads."""
        from django.http import FileResponse, Http404
        from django.utils.encoding import escape_uri_path
        from wsgiref.util import FileWrapper
        import os
        
        if not self.image or not os.path.exists(self.image.path):
            raise Http404("Image not found")
            
        # Get the image file
        image = open(self.image.path, 'rb')
        
        # Create a file-like buffer to receive the watermarked image
        from io import BytesIO
        from PIL import Image, ImageDraw, ImageFont
        
        try:
            # Open the image and add watermark
            img = Image.open(image).convert('RGBA')
            
            # Create watermark
            watermark = Image.new('RGBA', img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(watermark)
            
            # Use a default font (you might want to use a custom font)
            try:
                font_size = int(min(img.size) / 20)
                
                # Try to load common system fonts in order of preference
                font_paths = [
                    'DejaVuSans.ttf',  # Common in Linux systems
                    'DejaVuSans-Bold.ttf',
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',  # Common Linux path
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    'arial.ttf',  # Fallback to original
                    'Arial.ttf',
                    'ARIAL.TTF'
                ]
                
                font = None
                for font_path in font_paths:
                    try:
                        font = ImageFont.truetype(font_path, font_size)
                        break
                    except (IOError, OSError):
                        continue
                
                # If no font was loaded successfully, use default
                if font is None:
                    font = ImageFont.load_default()
                    
            except Exception:
                font = ImageFont.load_default()
            except IOError:
                font = ImageFont.load_default()
                
            # Add watermark text
            text = f" {self.gallery.photographer.username if self.gallery.photographer else 'EventPNG'}"
            
            # Get text bounding box and calculate dimensions
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Position the watermark in the center
            x = (img.width - text_width) // 2
            y = (img.height - text_height) // 2
            
            # Draw semi-transparent background for better visibility
            draw.rectangle([x-10, y-10, x + text_width + 10, y + text_height + 10], 
                          fill=(0, 0, 0, 128))
            
            # Draw the text
            draw.text((x, y), text, font=font, fill=(255, 255, 255, 200))
            
            # Combine the original image with the watermark
            watermarked = Image.alpha_composite(img, watermark)
            
            # Convert back to RGB (removes alpha channel for JPEG compatibility)
            if img.format == 'JPEG' or img.format == 'JPG':
                watermarked = watermarked.convert('RGB')
                
            # Save to a buffer
            buffer = BytesIO()
            watermarked.save(buffer, format=img.format or 'PNG')
            buffer.seek(0)
            
            # Create a response with security headers
            response = FileResponse(buffer, content_type=f"image/{img.format.lower() or 'png'}")
            
            # Set security headers to prevent downloads and hotlinking
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(self.image.name)}"'
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'SAMEORIGIN'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'same-origin'
            response['Content-Security-Policy'] = "default-src 'self'"
            
            return response
            
        except Exception as e:
            # If there's an error, log it and return the original image
            import logging
            logger = logging.getLogger(__name__)
            
            # Fall back to serving the original image
            return FileResponse(open(self.image.path, 'rb'), 
                              content_type=self.mime_type or 'image/jpeg')
        
        # If this is the first photo in the gallery, set it as the cover
        if self.gallery and not self.gallery.cover_photo:
            self.gallery.cover_photo = self
            self.gallery.save(update_fields=['cover_photo'])

class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'


class Payment(models.Model):
    """
    Tracks payments made by users for photos.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount paid in USD"
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    payment_intent_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Payment processor's transaction ID"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        help_text="Payment method used (e.g., 'card', 'paypal')"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        try:
            status = getattr(self, 'status', 'unknown')
            status_display = self.get_status_display() if hasattr(self, 'get_status_display') else status
            amount = f"${float(self.amount):.2f}" if hasattr(self, 'amount') and self.amount is not None else "$0.00"
            return f"Payment {self.id} - {status_display} - {amount}"
        except Exception as e:
            return f"Payment {getattr(self, 'id', 'unknown')} - error"


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
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='downloads',
        help_text="Payment associated with this download, if any"
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    download_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        help_text="Unique token for secure download links"
    )

    class Meta:
        ordering = ['-downloaded_at']


class Like(models.Model):
    """
    Tracks when users like photos.
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
        unique_together = ['user', 'photo']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'photo']),
        ]

    def __str__(self):
        user_str = str(self.user) if self.user else "[deleted user]"
        photo_str = str(self.photo) if hasattr(self, 'photo') and self.photo else "[deleted photo]"
        return f"{user_str} likes {photo_str}"

    @property
    def is_paid(self):
        """Check if the download is associated with a completed payment."""
        return self.payment and self.payment.status == PaymentStatus.COMPLETED
