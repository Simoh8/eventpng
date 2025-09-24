from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, IntervalSchedule
from datetime import timedelta

class Command(BaseCommand):
    help = 'Initialize Celery Beat periodic tasks'

    def handle(self, *args, **options):
        # Create schedule for homepage cache update (every 30 minutes)
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=30,
            period=IntervalSchedule.MINUTES,
        )
        
        # Create or update homepage cache task
        task, created = PeriodicTask.objects.get_or_create(
            name='Update Homepage Cache',
            task='gallery.tasks.update_homepage_cache',
            defaults={
                'interval': schedule,
                'enabled': True,
                'description': 'Updates the homepage cache every 30 minutes',
            }
        )
        
        if not created:
            task.interval = schedule
            task.save()
        
        # Create schedule for gallery stats update (daily)
        daily_schedule, created = IntervalSchedule.objects.get_or_create(
            every=1,
            period=IntervalSchedule.DAYS,
        )
        
        # Create or update gallery stats task
        stats_task, created = PeriodicTask.objects.get_or_create(
            name='Update Gallery Statistics',
            task='gallery.tasks.update_gallery_stats',
            defaults={
                'interval': daily_schedule,
                'enabled': True,
                'description': 'Updates gallery statistics daily',
            }
        )
        
        if not created:
            stats_task.interval = daily_schedule
            stats_task.save()
        
        self.stdout.write(self.style.SUCCESS('Successfully initialized Celery Beat tasks'))
