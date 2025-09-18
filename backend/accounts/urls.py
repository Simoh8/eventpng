from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import (
    CSRFTokenView, EnvTestView,
    PasswordResetRequestView, PasswordResetConfirmView
)
from .google_views import GoogleAuthConfigView, GoogleLogin
from .api_views import AccountSettingsView

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('csrf/', CSRFTokenView.as_view(), name='get_csrf'),
    
    # Google OAuth
    path('google/', include([
        path('', GoogleLogin.as_view(), name='google_auth'),  # Redirect to login by default
        path('config/', GoogleAuthConfigView.as_view(), name='google_config'),
        path('login/', GoogleLogin.as_view(), name='google_login'),
    ])),
    
    # User management
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('me/update/', views.UserDetailView.as_view(), name='update_user'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # Password reset
    path('password/reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Account settings
    path('settings/', AccountSettingsView.as_view(), name='account_settings'),
    
    # Test endpoint (remove in production)
    path('env-test/', EnvTestView.as_view(), name='env_test'),
]
