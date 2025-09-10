from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings

class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    """
    Custom Google OAuth2 adapter that works with our email-based user model.
    """
    def complete_login(self, request, app, token, **kwargs):
        # Get the user info from Google
        resp = self.get_callback_response(request, app, token)
        
        # Extract the email from the response
        email = resp.get('email')
        if not email:
            raise ValueError('Email not found in Google OAuth response')
        
        # Get or create the user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            # Try to get the user by email
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Create a new user if they don't exist
            user = User.objects.create_user(
                email=email,
                password=None,  # No password for social accounts
                first_name=resp.get('given_name', ''),
                last_name=resp.get('family_name', '')
            )
        
        # Create or update the social account
        from allauth.socialaccount.models import SocialAccount
        from allauth.socialaccount import providers
        
        social_account = SocialAccount.objects.filter(
            provider=self.provider_id,
            uid=resp['sub']
        ).first()
        
        if not social_account:
            social_account = SocialAccount(
                user=user,
                provider=self.provider_id,
                uid=resp['sub'],
                extra_data=resp
            )
            social_account.save()
        
        return user

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter to handle social logins.
    """
    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a
        social provider, but before the login is actually processed.
        """
        # Get the user's email from the social login
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return
            
        # Check if a user with this email already exists
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(email=email)
            
            # If the user exists but the social account isn't connected yet,
            # connect them
            if not user.socialaccount_set.filter(provider=sociallogin.account.provider).exists():
                sociallogin.connect(request, user)
        except User.DoesNotExist:
            # User doesn't exist, let allauth create it
            pass
