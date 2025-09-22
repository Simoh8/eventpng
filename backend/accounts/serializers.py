import logging
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.conf import settings
from django.utils.http import urlsafe_base64_decode as uid_decoder
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator
from rest_framework.exceptions import ValidationError

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the user object."""
    email = serializers.EmailField(required=False)  # Make email optional for updates
    is_photographer = serializers.BooleanField(read_only=True)  # Explicitly include is_photographer
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'is_photographer', 'date_joined', 'phone_number', 'bio')
        read_only_fields = ('id', 'date_joined', 'is_photographer')  # Prevent updating is_photographer via this endpoint
    
    def validate_email(self, value):
        """
        Validate that the email is unique and not empty.
        """
        if not value:
            raise serializers.ValidationError("Email cannot be empty")
            
        # Check if email is already taken by another user
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()  # Store emails in lowercase for consistency
    
    def update(self, instance, validated_data):
        """
        Update and return user instance, given the validated data.
        """
        # Remove password from validated_data if present (should be updated via change password endpoint)
        validated_data.pop('password', None)
        
        # Update the user instance with the validated data
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating user objects."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password', 'placeholder': 'Password'},
        min_length=8,
        error_messages={
            'min_length': 'Password must be at least 8 characters long.',
            'blank': 'Password cannot be blank.'
        },
        help_text=(
            'Password must be at least 8 characters long, contain at least one digit, '
            'one uppercase letter, and one special character.'
        )
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password', 'placeholder': 'Confirm Password'}
    )
    email = serializers.EmailField(required=True, allow_blank=False)
    full_name = serializers.CharField(required=True, allow_blank=False)
    
    is_photographer = serializers.BooleanField(
        required=False,
        default=False,
        write_only=False
    )
    
    class Meta:
        model = User
        fields = ('email', 'full_name', 'password', 'confirm_password', 'phone_number', 'is_photographer')
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8},
            'email': {'required': True, 'allow_blank': False},
            'full_name': {'required': True, 'allow_blank': False},
            'phone_number': {'required': False, 'allow_blank': True}
        }
    
    def validate_password(self, value):
        """Validate password requirements."""
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
            
        # Check for at least one digit
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError('Password must contain at least one digit.')
            
        # Check for at least one uppercase letter
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')
            
        # Check for at least one special character
        special_characters = "[~!@#$%^&*()_+{}:\"'<>,.?/\]\[`~]"
        if not any(char in special_characters for char in value):
            raise serializers.ValidationError('Password must contain at least one special character.')
            
        return value
        
    def validate(self, data):
        """Validate that the two password fields match."""
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Password fields didn't match."})
        return data
    
    def validate_email(self, value):
        """Validate that the email is unique and properly formatted."""
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        """Create and return a new user with encrypted password."""
        # Remove confirm_password from validated_data as it's not a model field
        validated_data.pop('confirm_password', None)
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data.get('full_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password']
        )
        
        return user

class EmailSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset e-mail.
    """
    email = serializers.EmailField()
    
    class Meta:
        fields = ('email',)

class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming a password reset attempt.
    """
    new_password1 = serializers.CharField(max_length=128)
    new_password2 = serializers.CharField(max_length=128)
    uid = serializers.CharField()
    token = serializers.CharField()

    set_password_form_class = SetPasswordForm
    set_password_form = None
    user = None
    _errors = {}

    def validate(self, attrs):
        logger = logging.getLogger(__name__)
        
        try:
            # Decode the uid to get the user
            try:
                uid = force_str(uid_decoder(attrs['uid']))
                self.user = User._default_manager.get(pk=uid)
            except (TypeError, ValueError, OverflowError) as e:
                raise ValidationError({'uid': ['Invalid user ID format.']})
            except User.DoesNotExist:
                raise ValidationError({'uid': ['User does not exist.']})

            # Check the token before validating password
            if not default_token_generator.check_token(self.user, attrs['token']):
                raise ValidationError({'token': ['Invalid or expired token. Please request a new password reset.']})

            # Construct SetPasswordForm instance
            self.set_password_form = self.set_password_form_class(
                user=self.user, 
                data={
                    'new_password1': attrs['new_password1'],
                    'new_password2': attrs['new_password2'],
                }
            )

            # Validate the form
            if not self.set_password_form.is_valid():
                errors = self.set_password_form.errors.get_json_data()
                # Convert form errors to a more user-friendly format
                error_messages = {}
                for field, field_errors in self.set_password_form.errors.items():
                    error_messages[field] = [str(e) for e in field_errors]
                raise serializers.ValidationError(error_messages)

            return attrs

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError({'non_field_errors': ['An error occurred while processing your request.']})

        return attrs

    def save(self):
        return self.set_password_form.save()

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

class CustomLoginSerializer(serializers.Serializer):
    """
    Custom serializer for email-based login.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'),
                              email=email, password=password)
            if not user:
                msg = _('Unable to log in with provided credentials.')
                raise serializers.ValidationError(msg, code='authorization')
        else:
            msg = _('Must include "email" and "password".')
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your old password was entered incorrectly. Please enter it again.")
        return value

    def update(self, instance, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save()
        return instance
