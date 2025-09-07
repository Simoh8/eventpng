import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

def test_storage():
    # Initialize Django
    django.setup()
    
    from django.core.files.storage import default_storage
    from django.core.files.base import ContentFile
    
    print("=== Testing File Storage ===")
    print(f"Storage class: {default_storage.__class__.__name__}")
    
    # Test file content and path
    test_content = b"This is a test file."
    test_path = 'test_file.txt'
    
    try:
        # Save file
        saved_path = default_storage.save(test_path, ContentFile(test_content))
        print(f"File saved to: {saved_path}")
        
        # Check if file exists
        exists = default_storage.exists(saved_path)
        print(f"File exists: {exists}")
        
        # Read file content
        with default_storage.open(saved_path, 'rb') as f:
            content = f.read()
            print(f"File content: {content}")
        
        # Clean up
        default_storage.delete(saved_path)
        print("Test file deleted.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_storage()
