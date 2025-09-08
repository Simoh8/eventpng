from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os

class Command(BaseCommand):
    help = 'Test the file storage system'

    def handle(self, *args, **options):
        self.stdout.write("=== Testing File Storage ===")
        self.stdout.write(f"Storage class: {default_storage.__class__.__module__}.{default_storage.__class__.__name__}")
        
        # Test file content and path
        test_content = b"This is a test file from management command."
        test_path = 'test_management_command.txt'
        
        try:
            # Save file
            saved_path = default_storage.save(test_path, ContentFile(test_content))
            self.stdout.write(self.style.SUCCESS(f"File saved to: {saved_path}"))
            
            # Check if file exists
            exists = default_storage.exists(saved_path)
            self.stdout.write(f"File exists: {exists}")
            
            # Get file URL
            try:
                url = default_storage.url(saved_path)
                self.stdout.write(f"File URL: {url}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not get URL: {e}"))
            
            # Read file content
            try:
                with default_storage.open(saved_path, 'rb') as f:
                    content = f.read()
                    self.stdout.write(f"File content: {content}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Could not read file: {e}"))
            
            # Clean up
            default_storage.delete(saved_path)
            self.stdout.write(self.style.SUCCESS("Test file deleted."))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
