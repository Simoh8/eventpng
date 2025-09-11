from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.conf import settings
import os

@deconstructible
class CachedFileSystemStorage(FileSystemStorage):
    """
    A file storage backend that adds cache control headers to responses.
    """
    def __init__(self, location=None, base_url=None, *args, **kwargs):
        if location is None:
            location = settings.MEDIA_ROOT
        if base_url is None:
            base_url = settings.MEDIA_URL
        super().__init__(location, base_url, *args, **kwargs)

    def url(self, name, *args, **kwargs):
        url = super().url(name, *args, **kwargs)
        # Add cache control to the URL for CDN or reverse proxy
        return url

    def _save(self, name, content):
        # Call the parent class's _save method
        name = super()._save(name, content)
        # Set appropriate permissions
        if settings.FILE_UPLOAD_PERMISSIONS is not None:
            os.chmod(os.path.join(self.location, name), settings.FILE_UPLOAD_PERMISSIONS)
        return name
