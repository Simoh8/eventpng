import os
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

def test_local_storage():
    print("Testing local file storage...")
    
    # Test file content and path
    test_content = b"This is a test file for local storage."
    test_path = 'test_local.txt'
    
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
                assert content == test_content, "File content doesn't match!"
                print("File content matches!")
        except Exception as e:
            print(f"Could not read file: {e}")
            raise
        
        # Clean up
        default_storage.delete(saved_path)
        print("Test file deleted.")
        
        print("Local storage test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error during storage test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import django
    import sys
    
    # Set up Django environment
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    
    test_local_storage()
