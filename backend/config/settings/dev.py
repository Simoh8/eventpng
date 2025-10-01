from .base import *
import stripe

DEBUG = True

# Email settings
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Stripe settings
STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "your_test_public_key_here")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "your_test_secret_key_here")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "your_webhook_secret_here")

# Configure Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "stripe": {
            "handlers": ["console"],
            "level": "INFO",
        },
    },
}
