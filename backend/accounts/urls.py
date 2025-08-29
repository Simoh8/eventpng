from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User management
    path('register/', views.UserCreateView.as_view(), name='register'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('me/update/', views.UserDetailView.as_view(), name='update_profile'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
]
