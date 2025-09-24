import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Add periodic tasks
app.conf.beat_schedule = {
    'update-homepage-cache-every-30-minutes': {
        'task': 'gallery.tasks.update_homepage_cache',
        'schedule': 1800.0,  # 30 minutes in seconds
    },
    'update-gallery-stats-daily': {
        'task': 'gallery.tasks.update_gallery_stats',
        'schedule': 86400.0,  # 24 hours in seconds
    },
}
