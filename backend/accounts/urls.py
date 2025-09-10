from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import GoogleAuthConfigView, GoogleLogin, CSRFTokenView, EnvTestView
from .api_views import AccountSettingsView

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('csrf/', CSRFTokenView.as_view(), name='get_csrf'),
    
    # User management
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('me/update/', views.UserDetailView.as_view(), name='update_profile'),
    path('me/account-settings/', AccountSettingsView.as_view(), name='account_settings'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # OAuth Configuration
    path('config/google/', GoogleAuthConfigView.as_view(), name='google_auth_config'),
    
    # Google OAuth2 endpoints
    path('google/', GoogleLogin.as_view(), name='google_login'),
    
    # Environment test endpoint
    path('env-test/', EnvTestView.as_view(), name='env_test'),
    
    # Add auth/me/ endpoint for frontend compatibility
    path('auth/me/', views.CurrentUserView.as_view(), name='auth_me'),
]
