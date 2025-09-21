from rest_framework import serializers
from ..models import CustomerProfile

class CustomerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the CustomerProfile model
    """
    class Meta:
        model = CustomerProfile
        fields = [
            'id', 
            'phone_number', 
            'date_of_birth',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'email_notifications',
            'newsletter_subscription',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'date_of_birth': {'format': '%Y-%m-%d'},
            'created_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
            'updated_at': {'format': '%Y-%m-%dT%H:%M:%S%z'},
        }
    
    def to_representation(self, instance):
        """
        Customize the response format
        """
        representation = super().to_representation(instance)
        
        # Add user information
        user = instance.user
        representation['user'] = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'date_joined': user.date_joined.strftime('%Y-%m-%dT%H:%M:%S%z')
        }
        
        return representation
