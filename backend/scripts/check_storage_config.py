import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage

def check_config():
    print("=== Django Storage Configuration ===")
    print(f"DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not set')}")
    print(f"Using storage: {default_storage.__class__.__module__}.{default_storage.__class__.__name__}")
    
    print("\n=== Media Settings ===")
    print(f"MEDIA_ROOT: {getattr(settings, 'MEDIA_ROOT', 'Not set')}")
    print(f"MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Not set')}")
    
    print("\n=== Installed Apps ===")
    for app in settings.INSTALLED_APPS:
        print(f"- {app}")
    
    print("\n=== Middleware ===")
    for mw in settings.MIDDLEWARE:
        print(f"- {mw}")
    
    # Check if media directory exists and is writable
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    if media_root:
        print(f"\n=== Media Directory Check ===")
        print(f"MEDIA_ROOT exists: {os.path.exists(media_root)}")
        print(f"MEDIA_ROOT is directory: {os.path.isdir(media_root)}")
        print(f"MEDIA_ROOT is writable: {os.access(media_root, os.W_OK)}")
        
        # List contents of media directory
        try:
            print("\nMedia directory contents:")
            for item in os.listdir(media_root):
                path = os.path.join(media_root, item)
                print(f"- {item} ({'dir' if os.path.isdir(path) else 'file'})")
        except Exception as e:
            print(f"Error listing media directory: {e}")
    
    # Test file operations
    print("\n=== Storage Test ===")
    test_content = b"This is a test file."
    test_path = 'test_storage.txt'
    
    try:
        # Save file
        saved_path = default_storage.save(test_path, ContentFile(test_content))
        print(f"File saved to: {saved_path}")
        
        # Check if file exists
        exists = default_storage.exists(saved_path)
        print(f"File exists: {exists}")
        
        # Get file URL
        try:
            url = default_storage.url(saved_path)
            print(f"File URL: {url}")
        except Exception as e:
            print(f"Could not get URL: {e}")
        
        # Read file content
        try:
            with default_storage.open(saved_path, 'rb') as f:
                content = f.read()
                print(f"File content: {content}")
        except Exception as e:
            print(f"Could not read file: {e}")
        
        # Clean up
        default_storage.delete(saved_path)
        print("Test file deleted.")
        
    except Exception as e:
        print(f"Error during storage test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    from django.core.files.base import ContentFile
    check_config()
