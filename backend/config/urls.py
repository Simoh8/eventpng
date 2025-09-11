"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Import the custom admin site
from gallery.admin import admin_site as gallery_admin_site

# Unregister the default admin site
admin.site = gallery_admin_site

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API
    path('api/accounts/', include('accounts.urls')),  # User accounts and authentication
    path('api/gallery/', include('gallery.urls')),  # Gallery endpoints
    path('api/payments/', include('payments.urls')),  # Payment endpoints
    path('api/contact/', include('contact.urls')),  # Contact form endpoints
    
    # API Documentation and Authentication
    path('api-auth/', include('rest_framework.urls')),  # For the browsable API
    path('api/dj-rest-auth/', include('dj_rest_auth.urls')),  # For authentication endpoints
    
    # Health check
    path('health/', lambda request: JsonResponse({'status': 'ok'})),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Add support for the browsable API in production
if not settings.DEBUG:
    urlpatterns += [
        path('api-auth/', include('rest_framework.urls')),
    ]
