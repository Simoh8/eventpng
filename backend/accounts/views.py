from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from . import serializers

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    Register a new user and return JWT tokens.
    """
    serializer_class = serializers.UserCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = serializers.CustomTokenObtainPairSerializer.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': serializers.UserSerializer(user).data
        }
        
        return Response(data, status=status.HTTP_201_CREATED)

class UserCreateView(generics.CreateAPIView):
    """View for creating a new user."""
    serializer_class = serializers.UserCreateSerializer
    permission_classes = [permissions.AllowAny]

class UserDetailView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user details."""
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    """View for changing user password."""
    serializer_class = serializers.ChangePasswordSerializer
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
    serializer_class = serializers.CustomTokenObtainPairSerializer

class CurrentUserView(APIView):
    """View to get the current authenticated user."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = serializers.UserSerializer(request.user)
        return Response(serializer.data)
