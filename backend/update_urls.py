# Path to urls file
urls_path = '/home/simon/Desktop/images_project/backend/config/urls.py'

# Read the current content
with open(urls_path, 'r') as f:
    content = f.read()

# Add JsonResponse import if not present
if 'from django.http import JsonResponse' not in content:
    content = content.replace(
        'from django.conf.urls.static import static',
        'from django.conf.urls.static import static\nfrom django.http import JsonResponse'
    )

# Add social auth URLs
if 'path(\'api/auth/social/\', include(\'accounts.urls_social\')),' not in content:
    content = content.replace(
        "path('api/auth/', include('accounts.urls')),\n",
        "path('api/auth/', include('accounts.urls')),\n    path('api/auth/social/', include('accounts.urls_social')),  # Social auth endpoints\n"
    )

# Write the updated content back to the file
with open(urls_path, 'w') as f:
    f.write(content)

print("URLs updated successfully!")
