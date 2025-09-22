from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from .api_serializers import AccountSettingsSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class AccountSettingsView(APIView):
    """
    API endpoint for updating user account settings.
    Handles updates for user profile information.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        return {'request': self.request}
    
    def get_serializer(self, *args, **kwargs):
        return AccountSettingsSerializer(*args, **kwargs)
    
    def get(self, request, *args, **kwargs):
        """Retrieve the current user's account settings."""
        try:
            serializer = self.get_serializer(request.user, context=self.get_serializer_context())
            response_data = {
                'user': serializer.data
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch account settings'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_update(self, serializer):
        """Save the updated user instance."""
        serializer.save()
    
    def patch(self, request, *args, **kwargs):
        """Update the current user's account settings with partial update support."""
        try:
            serializer = self.get_serializer(
                instance=request.user,
                data=request.data,
                partial=True,
                context=self.get_serializer_context()
            )
            
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            response_data = {
                'user': serializer.data,
                'message': 'Account settings updated successfully'
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            
            return response
            
        except ValidationError as e:
            return Response({
                'status': 'error',
                'errors': e.detail
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_update(self, serializer):
        """Save the updated user instance."""
        serializer.save()

    def put(self, request, *args, **kwargs):
        """Handle PUT request as PATCH to support partial updates."""
        return self.patch(request, *args, **kwargs)
