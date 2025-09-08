import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files.storage import default_storage
from django.conf import settings

def check_storage():
    print("=== Storage Configuration ===")
    print(f"DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not set')}")
    print(f"Using storage: {default_storage.__class__.__module__}.{default_storage.__class__.__name__}")
    
    # Check if AWS is configured
    print("\n=== AWS Configuration ===")
    aws_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_STORAGE_BUCKET_NAME',
        'AWS_S3_REGION_NAME'
    ]
    
    for var in aws_vars:
        value = getattr(settings, var, None)
        if value:
            print(f"{var}: {value}")
        else:
            print(f"{var}: Not set")
    
    # Test file operations
    print("\n=== Storage Test ===")
    test_content = b"This is a test file."
    test_path = 'test_storage.txt'
    
    try:
        # Save file
        saved_path = default_storage.save(test_path, ContentFile(test_content))
        print(f"File saved to: {saved_path}")
        
        # Check if file exists
        exists = default_storage.exists(test_path)
        print(f"File exists: {exists}")
        
        # Get file URL
        try:
            url = default_storage.url(test_path)
            print(f"File URL: {url}")
        except Exception as e:
            print(f"Could not get URL: {e}")
        
        # Read file content
        try:
            with default_storage.open(test_path) as f:
                content = f.read()
                print(f"File content: {content}")
        except Exception as e:
            print(f"Could not read file: {e}")
        
        # Clean up
        default_storage.delete(test_path)
        print("Test file deleted.")
        
    except Exception as e:
        print(f"Error during storage test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_storage()
