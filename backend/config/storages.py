from django.conf import settings
from django.core.files.storage import FileSystemStorage, get_storage_class
from storages.backends.s3boto3 import S3Boto3Storage
import os

class LocalMediaStorage(FileSystemStorage):
    """
    Custom file storage for media files on the local filesystem.
    """
    def __init__(self, location=None, base_url=None, **kwargs):
        if location is None:
            location = settings.MEDIA_ROOT
        if base_url is None:
            base_url = settings.MEDIA_URL
        super().__init__(location, base_url, **kwargs)

    def get_available_name(self, name, max_length=None):
        """
        Returns a filename that's free on the target storage system, and
        available for new content to be written to.
        """
        # If the filename already exists, add an underscore and a number (before the extension)
        # to avoid overwriting existing files
        if self.exists(name):
            name_parts = os.path.splitext(name)
            counter = 1
            while self.exists(f"{name_parts[0]}_{counter}{name_parts[1]}"):
                counter += 1
            name = f"{name_parts[0]}_{counter}{name_parts[1]}"
        return name

# Use S3 if configured, otherwise use local storage
if os.getenv('AWS_STORAGE_BUCKET_NAME'):
    class MediaStorage(S3Boto3Storage):
        """
        Custom S3 storage for media files.
        """
        location = 'media'
        file_overwrite = False
        default_acl = 'public-read'
        
        def get_available_name(self, name, max_length=None):
            """
            Returns a filename that's free on the target storage system, and
            available for new content to be written to.
            """
            # If the filename already exists, add an underscore and a number (before the extension)
            # to avoid overwriting existing files
            if self.exists(name):
                name_parts = os.path.splitext(name)
                counter = 1
                while self.exists(f"{name_parts[0]}_{counter}{name_parts[1]}"):
                    counter += 1
                name = f"{name_parts[0]}_{counter}{name_parts[1]}"
            return name
else:
    MediaStorage = LocalMediaStorage
