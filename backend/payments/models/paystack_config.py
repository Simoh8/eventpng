from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class PaystackConfig(models.Model):
    """
    Configuration for Paystack payment gateway.
    Only one instance of this model should exist.
    """
    is_live = models.BooleanField(
        _('Live Mode'),
        default=False,
        help_text=_('Use live mode for real transactions. Uncheck for test mode.')
    )
    test_secret_key = models.CharField(
        _('Test Secret Key'),
        max_length=255,
        blank=True,
        help_text=_('Your Paystack test secret key')
    )
    test_public_key = models.CharField(
        _('Test Public Key'),
        max_length=255,
        blank=True,
        help_text=_('Your Paystack test public key')
    )
    live_secret_key = models.CharField(
        _('Live Secret Key'),
        max_length=255,
        blank=True,
        help_text=_('Your Paystack live secret key')
    )
    live_public_key = models.CharField(
        _('Live Public Key'),
        max_length=255,
        blank=True,
        help_text=_('Your Paystack live public key')
    )
    webhook_secret = models.CharField(
        _('Webhook Secret'),
        max_length=255,
        blank=True,
        help_text=_('Your Paystack webhook secret for verifying webhook events')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Paystack Configuration')
        verbose_name_plural = _('Paystack Configuration')
        
    @property
    def secret_key(self):
        """Get the appropriate secret key based on the environment"""
        return self.live_secret_key if self.is_live else self.test_secret_key
        
    @property
    def public_key(self):
        """Get the appropriate public key based on the environment"""
        return self.live_public_key if self.is_live else self.test_public_key

    def __str__(self):
        return 'Paystack Configuration (Live Mode: {})'.format(
            'Enabled' if self.is_live else 'Disabled'
        )

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if PaystackConfig.objects.exists() and not self.pk:
            # Update the existing instance
            PaystackConfig.objects.all().update(
                is_live=self.is_live,
                test_secret_key=self.test_secret_key,
                test_public_key=self.test_public_key,
                live_secret_key=self.live_secret_key,
                live_public_key=self.live_public_key,
                webhook_secret=self.webhook_secret
            )
            return PaystackConfig.objects.first()
        return super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        """
        Get or create a single instance of PaystackConfig.
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
