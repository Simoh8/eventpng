from rest_framework import serializers
from .models import TicketPurchase
from gallery.ticket_models.models import TicketType

class TicketTypeVerificationSerializer(serializers.ModelSerializer):
    """Serializer for ticket type data in verification responses."""
    class Meta:
        model = TicketType
        fields = ['id', 'name', 'price']

class TicketVerificationSerializer(serializers.ModelSerializer):
    """Serializer for ticket verification responses."""
    ticket_type = TicketTypeVerificationSerializer()
    event_title = serializers.CharField(source='ticket_type.event.title')
    event_date = serializers.DateTimeField(source='ticket_type.event.start_date')
    event_location = serializers.CharField(source='ticket_type.event.location')
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email')
    
    class Meta:
        model = TicketPurchase
        fields = [
            'id',
            'verification_code',
            'status',
            'quantity',
            'created_at',
            'ticket_type',
            'event_title',
            'event_date',
            'event_location',
            'user_name',
            'user_email',
        ]
    
    def get_user_name(self, obj):
        """Get the user's full name or email if name is not available."""
        return obj.user.get_full_name() or obj.user.email


class TicketCheckInSerializer(serializers.Serializer):
    """Serializer for ticket check-in requests."""
    ticket_id = serializers.UUIDField(required=False)
    verification_code = serializers.UUIDField(required=False)
    
    def validate(self, data):
        """Validate that at least one of ticket_id or verification_code is provided."""
        if not any([data.get('ticket_id'), data.get('verification_code')]):
            raise serializers.ValidationError("Either ticket_id or verification_code is required")
        return data


class QRCodeVerificationSerializer(serializers.Serializer):
    """Serializer for QR code verification requests."""
    qr_data = serializers.CharField(required=True)
    
    def validate_qr_data(self, value):
        """Validate the QR code data format."""
        if not value.startswith('ticket:'):
            raise serializers.ValidationError("Invalid QR code format")
        return value
