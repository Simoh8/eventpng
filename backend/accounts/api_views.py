from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from . import serializers

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
        return serializers.AccountSettingsSerializer(*args, **kwargs)
    
    def get(self, request, *args, **kwargs):
        """Retrieve the current user's account settings."""
        serializer = self.get_serializer(request.user)
        return Response({
            'status': 'success',
            'data': serializer.data
        })
    
    def patch(self, request, *args, **kwargs):
        """Update the current user's account settings with partial update support."""
        serializer = self.get_serializer(
            instance=request.user,
            data=request.data,
            partial=True
        )
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response({
                'status': 'success',
                'message': 'Account settings updated successfully',
                'data': serializer.data
            })
            
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
