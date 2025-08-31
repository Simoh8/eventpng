from django.urls import path, include
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework_simplejwt.views import TokenVerifyView

class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter

class FacebookLoginView(SocialLoginView):
    adapter_class = FacebookOAuth2Adapter

urlpatterns = [
    # Social authentication
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('facebook/', FacebookLoginView.as_view(), name='facebook_login'),
    
    # Include default authentication URLs
    path('', include('dj_rest_auth.urls')),
    path('registration/', include('dj_rest_auth.registration.urls')),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
