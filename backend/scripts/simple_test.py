import os
import sys
import django
from django.core.files import File

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Testing file upload...")

# Create a test file
try:
    from django.core.files.storage import default_storage
    
    # Create a test file
    test_content = b"This is a test file."
    file_path = 'test_files/test.txt'
    
    # Save the file
    saved_path = default_storage.save(file_path, File(open(os.devnull, 'rb')))
    print(f"File saved to: {saved_path}")
    
    # Check if file exists
    exists = default_storage.exists(file_path)
    print(f"File exists: {exists}")
    
    # Get file URL
    try:
        url = default_storage.url(file_path)
        print(f"File URL: {url}")
    except Exception as e:
        print(f"Could not get URL: {e}")
    
    # Clean up
    default_storage.delete(file_path)
    print("Test file deleted.")
    
except Exception as e:
    print(f"Error: {e}")
    raise
