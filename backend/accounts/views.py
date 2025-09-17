import logging
from rest_framework import generics, permissions, status
from . import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
import os
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.conf import settings
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
import json
import requests
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
from rest_framework.exceptions import ValidationError

# Import serializers
from . import serializers as account_serializers
from rest_framework import permissions
from .serializers import EmailSerializer, PasswordResetConfirmSerializer

logger = logging.getLogger(__name__)

User = get_user_model()

class CSRFTokenView(APIView):
    """
    View to get CSRF token for the frontend.
    This is needed for session-based authentication.
    """
    authentication_classes = []  # Disable authentication
    permission_classes = []  # No permissions required
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        # Set CORS headers
        response = JsonResponse({'detail': 'CSRF cookie set'})
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

class RegisterView(generics.CreateAPIView):
    """
    Register a new user and return JWT tokens.
    """
    from .serializers import UserCreateSerializer
    serializer_class = UserCreateSerializer
    authentication_classes = []  # Disable authentication
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'
    
    @method_decorator(ensure_csrf_cookie)
    def post(self, request, *args, **kwargs):
        # Set CORS headers for preflight
        if request.method == 'OPTIONS':
            response = JsonResponse({})
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
        return self.create(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Log the registration attempt
        logger.info(f"Registration attempt with email: {request.data.get('email', 'No email provided')}")
        
        # Ensure we have a mutable copy of the request data
        data = request.data.copy()
        
        # If full_name is not provided, try to get it from name
        if 'name' in data and 'full_name' not in data:
            data['full_name'] = data.get('name')
            
        serializer = self.get_serializer(data=data)
        
        # Validate the serializer data
        if not serializer.is_valid():
            logger.warning(f"Registration validation errors: {serializer.errors}")
            response = Response(
                {
                    'status': 'error',
                    'errors': serializer.errors,
                    'message': 'Validation failed. Please check your input.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
        try:
            # Save the user
            user = serializer.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)
            refresh = str(refresh)
            
            # Get user data
            user_data = serializers.UserSerializer(user).data
            
            logger.info(f"User {user.email} registered successfully")
            
            response = Response({
                'status': 'success',
                'user': user_data,
                'access': access,
                'refresh': refresh,
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            
            # Set cookies for web clients
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access,
                expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
            )
            
            response.set_cookie(
                key=settings.SIMPLE_JWT['REFRESH_TOKEN_COOKIE'],
                value=refresh,
                expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Registration failed: {str(e)}", exc_info=True)
            response = Response(
                {
                    'status': 'error',
                    'message': 'An unexpected error occurred during registration. Please try again later.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response

class UserCreateView(generics.CreateAPIView):
    """View for creating a new user."""
    from .serializers import UserCreateSerializer
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    View for retrieving and updating user details.
    Supports GET (retrieve), PUT (full update), and PATCH (partial update) methods.
    """
    from .serializers import UserSerializer
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'patch', 'head', 'options']
    
    def get_object(self):
        """Return the current authenticated user."""
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        """Handle user update with proper response formatting."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            if getattr(instance, '_prefetched_objects_cache', None):
                # If 'prefetch_related' has been applied to a queryset, we need to
                # forcibly invalidate the prefetch cache on the instance.
                instance._prefetched_objects_cache = {}
                
            return Response({
                'status': 'success',
                'message': 'Profile updated successfully',
                'user': serializer.data
            })
            
        except serializers.ValidationError as e:
            return Response(
                {'status': 'error', 'errors': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ChangePasswordView(generics.UpdateAPIView):
    """View for changing user password."""
    from .serializers import ChangePasswordSerializer
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not self.object.check_password(serializer.data.get('old_password')):
                return Response(
                    {"old_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Set new password
            self.object.set_password(serializer.data.get('new_password'))
            self.object.save()
            return Response(
                {"message": "Password updated successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token obtain view to include user data in the response."""
    from .serializers import CustomTokenObtainPairSerializer
    serializer_class = CustomTokenObtainPairSerializer

class CurrentUserView(APIView):
    """
    View to get the current authenticated user.
    
    This endpoint returns the details of the currently authenticated user.
    It's used by the frontend to check authentication status and get user data.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'user'
    
    def get(self, request):
        try:
            # Get the user data using the UserSerializer
            from .serializers import UserSerializer
            serializer = UserSerializer(request.user)
            
            # Log successful user data retrieval
            logger.info(f"User data retrieved for: {request.user.email}")
            
            # Return the user data with a success status
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': 'User data retrieved successfully'
            })
            
        except Exception as e:
            # Log the error with traceback
            logger.error(f"Error retrieving user data: {str(e)}", exc_info=True)
            
            # Return a generic error message
            return Response(
                {
                    'status': 'error',
                    'message': 'An error occurred while retrieving user data. Please try again.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GoogleAuthConfigView(APIView):
    """
    View to provide Google OAuth configuration to the frontend.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        try:
            # Get the current site
            site = Site.objects.get_current()
            logger.info(f"Current site: {site.domain}")
            
            # Get all social apps for the current site
            apps = SocialApp.objects.filter(provider='google', sites=site)
            logger.info(f"Found {apps.count()} Google apps for site {site.domain}")
            
            if not apps.exists():
                # Try to find any Google app (in case sites weren't properly linked)
                apps = SocialApp.objects.filter(provider='google')
                logger.info(f"Found {apps.count()} Google apps in total")
                
                if not apps.exists():
                    logger.error("No Google OAuth app configured in the database")
                    return Response(
                        {'error': 'No Google OAuth app configured'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Link the first found app to the current site
                app = apps.first()
                app.sites.add(site)
                app.save()
                logger.info(f"Linked app {app.name} to site {site.domain}")
            else:
                app = apps.first()
            
            if not app.client_id or not app.secret:
                logger.error("Google OAuth app is missing client_id or secret")
                return Response(
                    {'error': 'Google OAuth app is not properly configured (missing client_id or secret)'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get frontend URL from settings or use default
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            
            logger.info(f"Returning Google OAuth config for client_id: {app.client_id}")
            return Response({
                'client_id': app.client_id,
                'redirect_uri': f"{frontend_url.rstrip('/')}/login"
            })
            
        except Site.DoesNotExist:
            logger.error("No sites configured in the database")
            return Response(
                {'error': 'No sites configured. Please run `python manage.py migrate` and set up a site in the admin.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.exception("Error in GoogleAuthConfigView")
            return Response(
                {'error': 'Failed to get Google OAuth configuration'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EnvTestView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from django.conf import settings
        return Response({
            'environment': {
                'GOOGLE_OAUTH2_CLIENT_ID': os.getenv('GOOGLE_OAUTH2_CLIENT_ID', 'Not set'),
                'GOOGLE_OAUTH2_SECRET': '*****' if os.getenv('GOOGLE_OAUTH2_SECRET') else 'Not set',
            },
            'settings': {
                'GOOGLE_OAUTH2_CLIENT_ID': getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', 'Not set'),
                'DEBUG': settings.DEBUG,
                'ALLOWED_HOSTS': settings.ALLOWED_HOSTS,
            },
            'socialaccount_providers': {
                'google': {
                    'client_id': getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}).get('google', {}).get('APP', {}).get('client_id', 'Not set'),
                    'scopes': getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}).get('google', {}).get('SCOPE', []),
                }
            }
        })


class PasswordResetRequestView(APIView):
    """
    API View for requesting a password reset email.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = EmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return an error response if the email doesn't exist
            return Response(
                {
                    'status': 'error', 
                    'message': 'The email address you entered does not exist in our system. Please check the email and try again, or sign up for a new account.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Generate token and uid for password reset
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build reset URL with domain and next parameter
        reset_path = f"/reset-password/{uid}/{token}/"
        reset_url = f"{settings.FRONTEND_URL}{reset_path}"
        next_url = f"{settings.FRONTEND_URL}/login"  # Where to redirect after password reset
        full_reset_url = f"{settings.FRONTEND_URL}{reset_path}?next={next_url}"
        
        # Email subject and message
        subject = "Password Reset Request"
        context = {
            'user': user,
            'reset_url': full_reset_url,
            'protocol': 'https' if request.is_secure() else 'http',
            'domain': request.get_host(),
            'site_name': 'EventPNG',
        }
        
        # Render email template
        message = render_to_string('emails/password_reset_email.html', context)
        
        try:
            # Send email
            send_mail(
                subject=subject,
                message='',  # Empty message since we're using html_message
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=message,
                fail_silently=False,
            )
            
            return Response(
                {'status': 'success', 'message': 'Password reset email has been sent.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}")
            return Response(
                {'status': 'error', 'message': 'Failed to send password reset email.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """
    API View for confirming a password reset.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        logger.info(f"Password reset request data: {request.data}")
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"Password reset validation errors: {serializer.errors}")
            return Response(
                {'status': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = serializer.save()
            logger.info(f"Password reset successful for user: {user.email}")
            return Response(
                {'status': 'success', 'message': 'Password has been reset successfully.'},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            logger.error(f"Password reset validation error: {str(e.detail)}")
            return Response(
                {'status': 'error', 'errors': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}", exc_info=True)
            return Response(
                {'status': 'error', 'message': 'Failed to reset password. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GoogleLogin(APIView):
    """
    View for Google OAuth2 login.
    Handles the Google ID token verification and JWT token generation.
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'google_auth'
    
    def post(self, request, *args, **kwargs):
        credential = request.data.get('credential')
        access_token = request.data.get('access_token')
        
        # Log the login attempt
        logger.info("Google OAuth login attempt")
        
        if not credential and not access_token:
            logger.warning("Google OAuth: Missing both credential and access token")
            return Response(
                {
                    'status': 'error',
                    'code': 'missing_token',
                    'message': 'Credential or access token is required'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user_info = None
            
            # Try to verify the credential first
            if credential:
                logger.debug("Attempting to verify Google ID token from credential")
                user_info = self.verify_google_token(credential)
            
            # Fall back to access token if credential verification fails or not provided
            if not user_info and access_token:
                logger.debug("Falling back to access token verification")
                user_info = self.get_google_user_info(access_token)
                
            if not user_info:
                logger.warning("Google OAuth: Invalid or expired token provided")
                return Response(
                    {
                        'status': 'error',
                        'code': 'invalid_token',
                        'message': 'Invalid or expired Google token'
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Log successful token verification
            logger.info(f"Google OAuth token verified for email: {user_info.get('email')}")
                
            # Get or create the user
            user, created = self.get_or_create_user(user_info)
            
            # Return user data and tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            user_data = account_serializers.UserSerializer(user).data
            
            # Log successful authentication
            logger.info(f"Google OAuth login successful for user: {user.email}")
            
            # Return response in the format expected by the frontend
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data,
                'is_new_user': created
            })
            
        except Exception as e:
            # Log the full error with traceback
            logger.error(f"Google OAuth error: {str(e)}", exc_info=True)
            
            # Return a user-friendly error message
            return Response(
                {
                    'status': 'error',
                    'code': 'authentication_failed',
                    'message': 'Google authentication failed. Please try again.'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def verify_google_token(self, token):
        """
        Verify a Google ID token using the google-auth library.
        
        Args:
            token (str): The ID token to verify
            
        Returns:
            dict: The decoded token if verification is successful, None otherwise
        """
        try:
            import json
            import base64
            import requests
            from time import time
            
            logger.debug(f"Starting token verification. Token length: {len(token) if token else 0}")
            
            # First, try to verify locally
            try:
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
                
                client_id = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
                logger.debug(f"Loaded GOOGLE_OAUTH2_CLIENT_ID: {client_id}")
                if not client_id:
                    logger.error("GOOGLE_OAUTH2_CLIENT_ID environment variable not set")
                    # Try to get from settings directly as fallback
                    from django.conf import settings
                    client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
                    logger.debug(f"Tried getting client_id from settings: {client_id}")
                    if not client_id:
                        return None
                
                logger.debug(f"Attempting to verify token with client_id: {client_id}")
                
                # Try to decode the token to see its structure
                try:
                    # The token is in JWT format: header.payload.signature
                    parts = token.split('.')
                    if len(parts) != 3:
                        logger.error(f"Invalid token format. Expected 3 parts, got {len(parts)}")
                        return None
                        
                    # Decode the payload
                    payload = parts[1]
                    # Add padding if needed
                    payload += '=' * (-len(payload) % 4)
                    decoded_payload = base64.urlsafe_b64decode(payload).decode('utf-8')
                    payload_data = json.loads(decoded_payload)
                    
                    logger.debug(f"Token payload: {json.dumps(payload_data, indent=2)}")
                    
                    # Check token expiration
                    exp = payload_data.get('exp')
                    if exp and exp < time():
                        logger.error(f"Token has expired. Expiration time: {exp}, Current time: {time()}")
                        return None
                        
                    # Check audience
                    aud = payload_data.get('aud')
                    if isinstance(aud, list):
                        if client_id not in aud:
                            logger.error(f"Client ID {client_id} not in audience list: {aud}")
                            return None
                    elif aud != client_id:
                        logger.error(f"Audience mismatch. Expected: {client_id}, Got: {aud}")
                        return None
                        
                except Exception as e:
                    logger.error(f"Error decoding token payload: {str(e)}")
                    return None
                
                # Now verify the token with Google's library
                logger.debug("Verifying token with google-auth library...")
                idinfo = id_token.verify_oauth2_token(
                    token,
                    google_requests.Request(),
                    client_id
                )
                
                logger.info(f"Successfully verified Google token for user: {idinfo.get('email')}")
                return idinfo
                
            except Exception as e:
                logger.warning(f"Local token verification failed, trying Google's tokeninfo endpoint. Error: {str(e)}")
            
            # Fall back to Google's tokeninfo endpoint
            try:
                response = requests.get(
                    'https://oauth2.googleapis.com/tokeninfo',
                    params={'id_token': token}
                )
                response.raise_for_status()
                idinfo = response.json()
                
                # Verify the client ID
                if idinfo.get('aud') != os.getenv('GOOGLE_OAUTH2_CLIENT_ID'):
                    logger.warning(f"Token's audience doesn't match client ID via tokeninfo")
                    return None
                    
                logger.info(f"Successfully verified Google token via tokeninfo for user: {idinfo.get('email')}")
                return idinfo
                
            except Exception as e:
                logger.error(f"Token verification via tokeninfo failed: {str(e)}")
                return None
                
        except Exception as e:
            logger.exception("Unexpected error in verify_google_token")
            return None
            
    def _get_unique_username(self, base_username):
        """Generate a unique username by appending a number if needed."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        username = base_username
        counter = 1
        
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
            
        return username
    
    def get_google_user_info(self, access_token):
        try:
            # First, try to get user info using the access token
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers=headers
            )
            response.raise_for_status()
            
            user_info = response.json()
            
            # Verify the token's audience matches our client ID
            client_id = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
            if not client_id:
                logger.error("GOOGLE_OAUTH2_CLIENT_ID environment variable not set")
                return None
                
            # Verify the token using Google's tokeninfo endpoint
            token_info_url = f'https://oauth2.googleapis.com/tokeninfo?access_token={access_token}'
            token_response = requests.get(token_info_url)
            
            if token_response.status_code == 200:
                token_info = token_response.json()
                if token_info.get('aud') != client_id:
                    logger.warning(f"Google OAuth: Token's audience doesn't match client ID. Expected: {client_id}, Got: {token_info.get('aud')}")
                    return None
                
                # If we have an email in the token info, make sure it matches the user info
                if 'email' in token_info and 'email' in user_info and token_info['email'] != user_info['email']:
                    logger.warning("Email mismatch between token info and user info")
                    return None
                    
                return user_info
            
            logger.error(f"Failed to verify access token: {token_response.text}")
            return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch user info from Google: {str(e)}")
            return None
        except Exception as e:
            logger.exception("Unexpected error in get_google_user_info")
            return None
            
    def get_or_create_user(self, user_info):
        """Get or create a user based on Google user info."""
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        
        try:
            # Try to get existing user
            user = User.objects.get(email=email)
            created = False
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                full_name=f"{first_name} {last_name}".strip(),
                is_active=True
            )
            created = True
            
            # Create social account
            SocialAccount.objects.create(
                user=user,
                provider='google',
                uid=user_info.get('sub', ''),
                extra_data=user_info
            )
        
        return user, created
