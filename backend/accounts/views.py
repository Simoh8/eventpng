import logging
from rest_framework import generics, permissions, status, viewsets
from . import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
import os
from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenObtainPairView
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
from .serializers import EmailSerializer, PasswordResetConfirmSerializer, ChangePasswordSerializer, UserSerializer

logger = logging.getLogger(__name__)

User = get_user_model()

class CustomTokenObtainPairView(BaseTokenObtainPairView):
    """
    Custom token obtain view that includes additional user data in the response.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            return Response(
                {"detail": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get the user from the validated data
        user = serializer.user
        
        # Get the token data
        data = serializer.validated_data
        
        # Add user data to the response
        from .serializers import UserSerializer
        user_serializer = UserSerializer(user, context={'request': request})
        data['user'] = user_serializer.data
        
        response = Response(data, status=status.HTTP_200_OK)
        
        # Set CORS headers
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        
        return response


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    View to retrieve and update the authenticated user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        
        # Set CORS headers
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        
        return response


class ChangePasswordView(generics.UpdateAPIView):
    """
    View to change the authenticated user's password.
    """
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
            
            response = Response(
                {"message": "Password updated successfully"},
                status=status.HTTP_200_OK
            )
        else:
            response = Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set CORS headers
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        
        return response


class CurrentUserView(APIView):
    """
    View to get the currently authenticated user's data.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from .serializers import UserSerializer
        
        try:
            # Log the user making the request
            user = request.user
            logger.info(f"CurrentUserView - Request from user ID: {user.id}")
            
            # Debug: Log all available user attributes
            logger.info(f"User model fields: {[f.name for f in user._meta.fields]}")
            
            # Get all field values for debugging
            user_data = {}
            for field in user._meta.fields:
                try:
                    value = getattr(user, field.name, 'N/A')
                    user_data[field.name] = str(value)[:100]  # Truncate long values
                except Exception as e:
                    user_data[field.name] = f'Error: {str(e)}'
            
            logger.info(f"CurrentUserView - User data: {user_data}")
            
            # Serialize user data
            serializer = UserSerializer(user, context={'request': request})
            serialized_data = serializer.data
            logger.info(f"CurrentUserView - Serialized data: {serialized_data}")
            
            # Prepare response
            response_data = {
                'user': serialized_data,
                'is_authenticated': user.is_authenticated,
                'auth_method': 'JWT' if hasattr(request, 'auth') else 'Session',
                'debug': {
                    'user_id': user.id,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                }
            }
            
            response = Response(response_data)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            
            logger.info(f"CurrentUserView - Response prepared with status: {response.status_code}")
            return response
            
        except Exception as e:
            logger.error(f"Error in CurrentUserView: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to fetch user data', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    from .serializers_custom import UserCreateSerializer
    serializer_class = UserCreateSerializer
    authentication_classes = []  # Disable authentication
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'
    
    @method_decorator(ensure_csrf_cookie)
    def post(self, request, *args, **kwargs):
        """
        Handle POST request for user registration.
        """
        # Set CORS headers for preflight
        if request.method == 'OPTIONS':
            response = JsonResponse({})
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
        return self.create(request, *args, **kwargs)

def create(self, request, *args, **kwargs):
    """
    Create a new user and return authentication tokens.
    """
    # Log the registration attempt
    logger.info(f"Registration attempt with email: {request.data.get('email', 'No email provided')}")
    
    # Ensure we have a mutable copy of the request data
    data = request.data.copy()
    
    # If full_name is not provided, try to get it from name
    if 'name' in data and 'full_name' not in data:
        data['full_name'] = data.get('name')
    
    # Handle phone number formatting if provided
    if 'phone_number' in data and data['phone_number']:
        data['phone_number'] = ''.join(filter(str.isdigit, data['phone_number']))
        
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
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        return response
        
    try:
        # Save the user
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh = str(refresh)
        
        # Get user data using the correct serializer
        from .serializers import UserSerializer
        user_serializer = UserSerializer(user, context={'request': request})
        user_data = user_serializer.data
        
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
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        
        # Set cookies for web clients
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=access,
            max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
        )
        
        response.set_cookie(
            key=settings.SIMPLE_JWT['REFRESH_TOKEN_COOKIE'],
            value=refresh,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
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
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
        return response


class PasswordResetRequestView(APIView):
    """
    View to handle password reset requests.
    Sends a password reset email with a token.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid email address'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            
            # Generate token and uid
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Build reset URL
            reset_url = f"{settings.FRONTEND_URL}/reset-password/confirm/{uid}/{token}/"
            
            # Send email
            subject = "Password Reset Requested"
            message = render_to_string('emails/password_reset_email.txt', {
                'user': user,
                'reset_url': reset_url,
            })
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
            return Response(
                {'message': 'Password reset email has been sent'}, 
                status=status.HTTP_200_OK
            )
            
        except User.DoesNotExist:
            # Don't reveal that the user doesn't exist
            return Response(
                {'message': 'If an account exists with this email, a password reset link has been sent'}, 
                status=status.HTTP_200_OK
            )


class PasswordResetConfirmView(APIView):
    """
    View to handle password reset confirmation.
    Validates the token and sets the new password.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, uidb64, token):
        try:
            # Decode the uidb64 to get the user
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            # Check if the token is valid
            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Invalid or expired token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate the new password
            serializer = PasswordResetConfirmSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid data', 'details': serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {'message': 'Password has been reset successfully'}, 
                status=status.HTTP_200_OK
            )
            
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'error': 'Invalid user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class EnvTestView(APIView):
    """
    View for testing environment variables and settings.
    This should be removed in production.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Return environment variables and settings for debugging purposes."""
        from django.conf import settings
        
        # Only expose non-sensitive settings
        safe_settings = {
            'DEBUG': settings.DEBUG,
            'ALLOWED_HOSTS': settings.ALLOWED_HOSTS,
            'CORS_ALLOWED_ORIGINS': getattr(settings, 'CORS_ALLOWED_ORIGINS', []),
            'CSRF_TRUSTED_ORIGINS': getattr(settings, 'CSRF_TRUSTED_ORIGINS', []),
            'SITE_ID': getattr(settings, 'SITE_ID', None),
            'FRONTEND_URL': os.getenv('FRONTEND_URL', 'Not set'),
            'GOOGLE_OAUTH2_CLIENT_ID': 'Set' if os.getenv('GOOGLE_OAUTH2_CLIENT_ID') else 'Not set',
            'EMAIL_BACKEND': getattr(settings, 'EMAIL_BACKEND', 'Not set'),
            'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', 'Not set'),
            'SIMPLE_JWT': {
                'ACCESS_TOKEN_LIFETIME': str(getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME', 'Not set')),
                'REFRESH_TOKEN_LIFETIME': str(getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME', 'Not set')),
            },
        }
        
        return Response({
            'status': 'success',
            'environment': safe_settings,
            'message': 'Environment test successful. Remove this endpoint in production.'
        })
