import re

# Path to settings file
settings_path = '/home/simon/Desktop/images_project/backend/config/settings.py'

# Read the current content
with open(settings_path, 'r') as f:
    content = f.read()

# Add social auth providers to INSTALLED_APPS
content = content.replace(
    "'allauth.socialaccount',",
    "'allauth.socialaccount',\n    'allauth.socialaccount.providers.google',\n    'allauth.socialaccount.providers.facebook',"
)

# Add import for auth_settings
if 'from .auth_settings import *' not in content:
    content = content.replace(
        'from pathlib import Path\n',
        'from pathlib import Path\nfrom .auth_settings import *\n'
    )

# Write the updated content back to the file
with open(settings_path, 'w') as f:
    f.write(content)

print("Settings updated successfully!")
