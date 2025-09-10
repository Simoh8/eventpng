from django.apps import apps
from django.contrib import admin

def register_social_account_models():
    """Register social account models with the admin."""
    try:
        # Import models dynamically to avoid circular imports
        social_app = apps.get_model('socialaccount', 'SocialApp')
        social_account = apps.get_model('socialaccount', 'SocialAccount')
        social_token = apps.get_model('socialaccount', 'SocialToken')
        
        # Register models with admin if not already registered
        if not social_app in admin.site._registry:
            admin.site.register(social_app)
        if not social_account in admin.site._registry:
            admin.site.register(social_account)
        if not social_token in admin.site._registry:
            admin.site.register(social_token)
            
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error registering social account models: {e}")
        return False
