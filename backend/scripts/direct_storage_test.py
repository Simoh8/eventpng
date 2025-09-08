import os
import sys
import django
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile

def test_direct_storage():
    print("=== Direct File Storage Test ===")
    
    # Set up Django
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    
    from django.conf import settings
    
    # Create a direct filesystem storage instance
    fs = FileSystemStorage()
    
    print(f"Storage location: {fs.location}")
    print(f"Base URL: {fs.base_url}")
    
    # Test file content and path
    test_content = b"This is a direct test file."
    test_path = 'direct_test.txt'
    
    try:
        # Ensure the directory exists
        os.makedirs(fs.location, exist_ok=True)
        print(f"Ensured directory exists: {fs.location}")
        
        # Save file directly
        saved_path = fs.save(test_path, ContentFile(test_content))
        print(f"File saved to: {saved_path}")
        print(f"Full path: {os.path.join(fs.location, saved_path)}")
        
        # Check if file exists
        exists = fs.exists(saved_path)
        print(f"File exists: {exists}")
        
        # Read file content
        with fs.open(saved_path, 'rb') as f:
            content = f.read()
            print(f"File content: {content}")
        
        # List files in the directory
        print("\nDirectory contents:")
        for f in os.listdir(fs.location):
            path = os.path.join(fs.location, f)
            print(f"- {f} ({'dir' if os.path.isdir(path) else 'file'}, {os.path.getsize(path)} bytes)")
        
        # Clean up
        fs.delete(saved_path)
        print("\nTest file deleted.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_direct_storage()
