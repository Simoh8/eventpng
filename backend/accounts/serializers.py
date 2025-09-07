from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the user object."""
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'is_photographer', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating user objects."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password', 'placeholder': 'Password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password', 'placeholder': 'Confirm Password'}
    )
    
    class Meta:
        model = User
        fields = ('email', 'full_name', 'password', 'confirm_password', 'is_photographer')
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8},
            'is_photographer': {'default': False}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        """Create and return a user with encrypted password."""
        # Remove confirm_password from the data before creating the user
        validated_data.pop('confirm_password', None)
        return User.objects.create_user(**validated_data)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer to include additional user data in the response."""
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)
        
        # Add user data to the response
        user_data = UserSerializer(self.user).data
        data.update({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user_data
        })
        return data

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is not correct")
        return value
    
    def update(self, instance, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save()
        return instance
