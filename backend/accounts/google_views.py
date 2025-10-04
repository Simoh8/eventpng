"""
Views for handling Google OAuth2 authentication.
"""
import os
import base64
import json
from time import time

from django.conf import settings
from django.contrib.sites.models import Site
from django.contrib.auth import get_user_model
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount, SocialApp
import requests

from . import serializers as account_serializers

User = get_user_model()

class GoogleAuthConfigView(APIView):
    """
    View to provide Google OAuth configuration to the frontend.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        try:
            # Get the current site
            site = Site.objects.get_current()
            
            # Get all social apps for the current site
            apps = SocialApp.objects.filter(provider='google', sites=site)
            
            if not apps.exists():
                # Try to find any Google app (in case sites weren't properly linked)
                apps = SocialApp.objects.filter(provider='google')
                
                if not apps.exists():
                    return Response(
                        {'error': 'No Google OAuth app configured'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Link the first found app to the current site
                app = apps.first()
                app.sites.add(site)
                app.save()
            else:
                app = apps.first()
            
            if not app.client_id or not app.secret:
                return Response(
                    {'error': 'Google OAuth app is not properly configured (missing client_id or secret)'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get frontend URL from settings or use default
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            
            return Response({
                'client_id': app.client_id,
                'redirect_uri': f"{frontend_url.rstrip('/')}/login"
            })
            
        except Site.DoesNotExist:
            return Response(
                {'error': 'No sites configured. Please run `python manage.py migrate` and set up a site in the admin.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to get Google OAuth configuration'},
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
        
        if not credential and not access_token:
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
                user_info = self.verify_google_token(credential)
            
            # Fall back to access token if credential verification fails or not provided
            if not user_info and access_token:
                user_info = self.get_google_user_info(access_token)
                
            if not user_info:
                return Response(
                    {
                        'status': 'error',
                        'code': 'invalid_token',
                        'message': 'Invalid or expired Google token'
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get or create the user
            user, created = self.get_or_create_user(user_info)
            
            # Return user data and tokens
            refresh = RefreshToken.for_user(user)
            user_serializer = account_serializers.UserSerializer(user, context={'request': request})
            user_data = user_serializer.data
            
            # Return response in the format expected by the frontend
            response = Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data,
                'is_new_user': created
            })
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            
            return response
            
        except Exception as e:
            # Return a user-friendly error message
            response = Response(
                {
                    'status': 'error',
                    'code': 'authentication_failed',
                    'message': 'Google authentication failed. Please try again.'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            return response

    def verify_google_token(self, token):
        """
        Verify a Google ID token using the google-auth library.
        """
        try:
            # First, try to verify locally
            try:
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
                
                client_id = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
                if not client_id:
                    # Try to get from settings directly as fallback
                    from django.conf import settings
                    client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
                    if not client_id:
                        return None
                
                # Try to decode the token to see its structure
                try:
                    # The token is in JWT format: header.payload.signature
                    parts = token.split('.')
                    if len(parts) != 3:
                        return None
                        
                    # Decode the payload
                    payload = parts[1]
                    # Add padding if needed
                    payload += '=' * (-len(payload) % 4)
                    decoded_payload = base64.urlsafe_b64decode(payload).decode('utf-8')
                    payload_data = json.loads(decoded_payload)
                    
                    # Check token expiration
                    exp = payload_data.get('exp')
                    if exp and exp < time():
                        return None
                        
                    # Check audience
                    aud = payload_data.get('aud')
                    if isinstance(aud, list):
                        if client_id not in aud:
                            return None
                    elif aud != client_id:
                        return None
                        
                except Exception as e:
                    return None
                
                # Now verify the token with Google's library
                idinfo = id_token.verify_oauth2_token(
                    token,
                    google_requests.Request(),
                    client_id
                )
                
                return idinfo
                
            except Exception as e:
                pass
            
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
                    return None
                    
                return idinfo
                
            except Exception as e:
                return None
                
        except Exception as e:
            return None
    
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
                return None
                
            # Verify the token using Google's tokeninfo endpoint
            token_info_url = f'https://oauth2.googleapis.com/tokeninfo?access_token={access_token}'
            token_response = requests.get(token_info_url)
            
            if token_response.status_code == 200:
                token_info = token_response.json()
                if token_info.get('aud') != client_id:
                    return None
                
                # If we have an email in the token info, make sure it matches the user info
                if 'email' in token_info and 'email' in user_info and token_info['email'] != user_info['email']:
                    return None
                    
                return user_info
            
            return None
                
        except requests.exceptions.RequestException as e:
            return None
        except Exception as e:
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