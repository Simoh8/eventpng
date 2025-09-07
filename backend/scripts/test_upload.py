import os
import sys
import django
from django.core.files import File
from django.conf import settings

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_file_upload():
    from django.contrib.auth import get_user_model
    from gallery.models import Gallery, Photo
    
    # Get or create a test user
    User = get_user_model()
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'is_photographer': True
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
    
    # Create a test gallery
    gallery, created = Gallery.objects.get_or_create(
        title='Test Gallery',
        photographer=user,
        defaults={
            'description': 'A test gallery',
            'is_public': True
        }
    )
    
    # Create a test image file
    from PIL import Image
    import tempfile
    
    # Create a temporary image file
    image = Image.new('RGB', (100, 100), color='red')
    tmp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    image.save(tmp_file, format='JPEG')
    tmp_file.seek(0)
    
    # Create a test photo
    photo = Photo.objects.create(
        gallery=gallery,
        uploaded_by=user,
        title='Test Photo',
        description='A test photo',
        is_public=True
    )
    
    # Save the image to the photo
    photo.image.save('test_photo.jpg', File(tmp_file), save=True)
    
    # Clean up
    tmp_file.close()
    os.unlink(tmp_file.name)
    
    print(f"Test photo created successfully! ID: {photo.id}")
    print(f"Image URL: {photo.image.url if hasattr(photo.image, 'url') else 'No URL available'}")
    print(f"Image path: {photo.image.path if hasattr(photo.image, 'path') else 'No local path available'}")

if __name__ == "__main__":
    test_file_upload()
