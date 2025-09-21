from django.apps import AppConfig


class CustomerDashboardConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customer_dashboard"

    def ready(self):
        # Import signals to register them
        import customer_dashboard.signals  # noqa
