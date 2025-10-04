from .base import *
import os

DEBUG = False



ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "eventpng.ledgerctrl.com").split(",")

# --- Security settings ---
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# --- Static files ---
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': os.getenv('GOOGLE_OAUTH2_CLIENT_ID'),
            'secret': os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET'),
            'key': ''
        }
    }
}
# --- Logging ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "logs/django.log",
        },
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["file", "console"], "level": "INFO"},
}

# --- CORS / CSRF ---
INSTALLED_APPS += [
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be before CommonMiddleware
    "django.middleware.common.CommonMiddleware",
] + MIDDLEWARE

# Frontend URL for password reset and other redirects
FRONTEND_URL = os.getenv("FRONTEND_URL")
SITE_URL = os.getenv("SITE_URL")

CORS_ALLOWED_ORIGINS = [
    "https://eventpng.vercel.app",
    "https://eventpng.ledgerctrl.com",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://eventpng.vercel.app",
    "https://eventpng.ledgerctrl.com",
]

# Additional CORS settings for OAuth
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-session-id',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Security headers for OAuth
SECURE_CROSS_ORIGIN_OPENER_POLICY = None  # Allow OAuth popups
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
