import os
import sys
from pathlib import Path
import django
from django.conf import settings

# Minimal Django setup
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Configure minimal settings
settings.configure(
    DEBUG=True,
    DATABASES={
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    },
    INSTALLED_APPS=[
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'accounts',
        'gallery',
    ],
)

django.setup()

# Now we can import models
from django.apps import apps

def check_model_str_method(model_class):
    """Check if a model's __str__ method can handle all cases."""
    if not hasattr(model_class, '__str__'):
        return "No __str__ method defined"
    
    # Get the source file and line number if possible
    try:
        source_file = model_class.__str__.__code__.co_filename
        line_number = model_class.__str__.__code__.co_firstlineno
        source = f"{source_file}:{line_number}"
    except (AttributeError, TypeError):
        source = "Unknown source"
    
    # Try to get an instance to test
    try:
        # Skip abstract models
        if model_class._meta.abstract:
            return "Abstract model - skipping instance check"
        
        # Skip models without database tables
        if not model_class._meta.managed or model_class._meta.proxy:
            return "Unmanaged or proxy model - skipping instance check"
            
        # Get the first instance if it exists
        instance = model_class.objects.first()
        if instance is None:
            return f"No instances to test (Source: {source})"
            
        try:
            result = str(instance)
            if result is None:
                return f"__str__ returned None (Source: {source})"
            if not isinstance(result, str):
                return f"__str__ returned non-string: {type(result).__name__} (Source: {source})"
            return f"OK (returns: '{result[:50]}{'...' if len(result) > 50 else ''}')"
        except Exception as e:
            return f"Error in __str__: {str(e)} (Source: {source})"
    except Exception as e:
        return f"Error querying model: {str(e)} (Source: {source})"

def main():
    print("Checking all models for __str__ issues...\n")
    
    # Get all models
    all_models = apps.get_models()
    
    for model in all_models:
        print(f"\nChecking model: {model.__module__}.{model.__name__}")
        result = check_model_str_method(model)
        print(f"  {result}")
        
        # If there was an error, print the model's fields
        if "None" in result or "Error" in result:
            print("  Fields:")
            for field in model._meta.get_fields():
                field_info = f"{field.name}: {field.__class__.__name__}"
                if hasattr(field, 'related_model') and field.related_model:
                    field_info += f" -> {field.related_model.__name__}"
                print(f"    - {field_info}")

if __name__ == "__main__":
    main()
