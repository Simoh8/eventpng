import logging
import re
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import ContactSubmission

class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'phone_number', 'country_code', 'message', 'subject']
        read_only_fields = ['submitted_at', 'is_processed']
        extra_kwargs = {
            'subject': {
                'required': False,  # Make subject optional
                'allow_blank': True,  # Allow empty string
                'default': 'User Inquiry'  # Set default value
            },
            'name': {'required': True},
            'email': {'required': True},
            'phone_number': {'required': True},
            'message': {'required': True}
        }
    
    def validate_phone_number(self, value):
        if not value:
            raise serializers.ValidationError("Phone number is required")
            
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, str(value)))
        
        # Check if it's a valid length (between 8 and 15 digits total)
        if len(digits) < 8:
            raise serializers.ValidationError("Phone number is too short")
            
        if len(digits) > 15:
            raise serializers.ValidationError("Phone number is too long")
            
        # Return the original value to preserve any formatting
        return value
    
    def validate_country_code(self, value):
        if not value:
            return '+254'  # Default to Kenya's country code
            
        # Ensure country code starts with +
        if not value.startswith('+'):
            value = '+' + value.lstrip('+0')
            
        # Ensure country code is valid (1-3 digits after +)
        if not re.match(r'^\+\d{1,3}$', value):
            raise serializers.ValidationError("Invalid country code format. Use format like +254")
            
        return value
        
    def validate(self, data):
        """
        Custom validation for the entire serializer
        """
        logger = logging.getLogger(__name__)
        logger.info(f"Validating contact form data: {data}")
        
        # Ensure required fields are present
        required_fields = ['name', 'email', 'phone_number', 'message']
        for field in required_fields:
            if not data.get(field):
                error_msg = f"Missing required field: {field}"
                logger.error(error_msg)
                raise serializers.ValidationError({field: "This field is required."})
        
        # Validate email format
        email = data.get('email', '').strip()
        if email and '@' not in email:
            error_msg = f"Invalid email format: {email}"
            logger.error(error_msg)
            raise serializers.ValidationError({"email": "Enter a valid email address."})
                
        # Set default subject if not provided or empty
        subject = data.get('subject', '').strip()
        if not subject:
            data['subject'] = 'User Inquiry'
            logger.info("Set default subject")
        
        # Log the final validated data
        logger.info(f"Validated contact form data: {data}")
        return data
