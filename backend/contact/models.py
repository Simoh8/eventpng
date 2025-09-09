from django.db import models
from django.utils import timezone
from django.conf import settings

class ContactSubmission(models.Model):
    """Model to store contact form submissions."""
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('responded', 'Responded'),
        ('closed', 'Closed'),
    ]
    
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    country_code = models.CharField(max_length=10, default='+254')
    message = models.TextField()
    subject = models.CharField(max_length=255, default='Bulk Download Inquiry')
    submitted_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
        db_index=True
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    response_notes = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts'
    )
    is_processed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Contact Submission'
        verbose_name_plural = 'Contact Submissions'

    def __str__(self):
        return f"{self.name} - {self.subject} ({self.submitted_at.strftime('%Y-%m-%d %H:%M')})"
        
    def save(self, *args, **kwargs):
        # Update responded_at when status changes to 'responded'
        if self.status == 'responded' and not self.responded_at:
            self.responded_at = timezone.now()
        super().save(*args, **kwargs)
