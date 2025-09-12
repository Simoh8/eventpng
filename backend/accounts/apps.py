from django.apps import AppConfig
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Import signals to register them
        try:
            import accounts.signals
        except ImportError as e:
            logger.warning(f"Failed to import accounts.signals: {e}")
        
        # Only register social account models if we're not in a management command
        # that doesn't need the full app registry
        import sys
        if 'migrate' in sys.argv or 'test' in sys.argv or 'collectstatic' in sys.argv:
            return
            
        # Register social account models with admin
        if not getattr(settings, 'TESTING', False):
            try:
                from config.admin_config import register_social_account_models
                register_social_account_models()
            except Exception as e:
                logger.warning(f"Failed to register social account models: {e}", exc_info=True)
