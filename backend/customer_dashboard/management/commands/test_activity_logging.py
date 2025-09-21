from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from gallery.models import Photo
from customer_dashboard.models import UserActivity
from customer_dashboard.utils.activity_logger import log_user_activity

User = get_user_model()

class Command(BaseCommand):
    help = 'Test the activity logging functionality'

    def handle(self, *args, **options):
        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={'email': 'test@example.com', 'password': 'testpass123'}
        )
        
        # Get a photo to test with
        photo = Photo.objects.first()
        if not photo:
            self.stdout.write(self.style.ERROR('No photos found in the database. Please add some photos first.'))
            return
        
        # Test logging a photo like
        self.stdout.write('Testing photo like activity...')
        log_user_activity(
            user=user,
            activity_type=UserActivity.ActivityType.PHOTO_LIKE,
            obj=photo,
            metadata={
                'photo_id': str(photo.id),
                'photo_title': photo.title,
                'gallery_id': str(photo.gallery_id) if hasattr(photo, 'gallery_id') and photo.gallery_id else None,
            }
        )
        
        # Test logging a photo view
        self.stdout.write('Testing photo view activity...')
        log_user_activity(
            user=user,
            activity_type=UserActivity.ActivityType.PHOTO_VIEW,
            obj=photo,
            metadata={
                'photo_id': str(photo.id),
                'view_duration': 30,  # seconds
                'source': 'gallery_page'
            }
        )
        
        # List recent activities
        activities = UserActivity.objects.filter(user=user).order_by('-created_at')
        self.stdout.write(self.style.SUCCESS(f'Successfully logged {activities.count()} activities'))
        
        for activity in activities:
            self.stdout.write(f"- {activity.get_activity_type_display()} at {activity.created_at}")
            if activity.content_object:
                self.stdout.write(f"  Object: {activity.content_object}")
            if activity.metadata:
                self.stdout.write(f"  Metadata: {activity.metadata}")
