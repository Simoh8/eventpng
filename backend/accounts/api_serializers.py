from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator

User = get_user_model()

class AccountSettingsSerializer(serializers.ModelSerializer):
    """Serializer for user account settings."""
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
            )
        ]
    )
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'phone_number',
            'bio',
            'date_joined',
            'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def validate_email(self, value):
        """Validate email uniqueness and format."""
        if not value:
            raise serializers.ValidationError("Email cannot be empty")
            
        # Check if email is already taken by another user
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
            
        return value.lower()
    
    def validate_full_name(self, value):
        """Validate full name is provided if updating."""
        if not value and 'full_name' in self.initial_data:
            raise serializers.ValidationError("Full name cannot be empty")
        return value
    
    def update(self, instance, validated_data):
        """Update and return user instance with validated data."""
        # Remove any fields that shouldn't be updated
        for field in ['password', 'is_staff', 'is_superuser']:
            validated_data.pop(field, None)
        
        # Update the user instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
