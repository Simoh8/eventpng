from rest_framework import serializers
from .models import TicketPurchase, TicketType
from gallery.models import Event

class TicketTypeSerializer(serializers.ModelSerializer):
    """Serializer for ticket types"""
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    
    class Meta:
        model = TicketType
        fields = [
            'id', 'name', 'description', 'price', 'quantity_available',
            'is_active', 'sale_start', 'sale_end', 'event', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Validate ticket type data"""
        if data['sale_start'] and data['sale_end'] and data['sale_start'] >= data['sale_end']:
            raise serializers.ValidationError("Sale end must be after sale start")
        return data

class TicketPurchaseSerializer(serializers.ModelSerializer):
    """Serializer for ticket purchases"""
    ticket_type = TicketTypeSerializer(read_only=True)
    event = serializers.SerializerMethodField()
    payment_intent_id = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketPurchase
        fields = [
            'id', 'ticket_type', 'event', 'status', 'quantity',
            'payment_method', 'payment_intent_id', 'total_price', 
            'created_at', 'qr_code', 'verification_code'
        ]
        read_only_fields = [
            'status', 'total_price', 'created_at', 'qr_code', 
            'ticket_type', 'event', 'verification_code', 'payment_intent_id'
        ]
    
    def get_event(self, obj):
        """Get the event details for the purchased ticket"""
        from gallery.serializers import EventSerializer
        return EventSerializer(obj.ticket_type.event).data
    
    def get_payment_intent_id(self, obj):
        """Only return payment_intent_id to the user who made the purchase"""
        request = self.context.get('request')
        if request and request.user == obj.user:
            return obj.payment_intent_id
        return None

class CreateTicketPurchaseSerializer(serializers.ModelSerializer):
    """Serializer for creating new ticket purchases"""
    ticket_type_id = serializers.PrimaryKeyRelatedField(
        queryset=TicketType.objects.filter(is_active=True),
        source='ticket_type',
        write_only=True,
        help_text="ID of the ticket type being purchased"
    )
    quantity = serializers.IntegerField(min_value=1, default=1)
    payment_intent_id = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = TicketPurchase
        fields = ['ticket_type_id', 'quantity', 'payment_method', 'payment_intent_id']
        extra_kwargs = {
            'payment_method': {'required': True}
        }
    
    def validate(self, data):
        """Validate ticket purchase"""
        ticket_type = data['ticket_type']
        quantity = data.get('quantity', 1)
        payment_method = data.get('payment_method')
        
        # Validate payment method
        valid_payment_methods = dict(TicketPurchase.PAYMENT_METHODS).keys()
        if payment_method not in valid_payment_methods:
            raise serializers.ValidationError({
                'payment_method': f'Invalid payment method. Must be one of: {", ".join(valid_payment_methods)}'
            })
        
        # For card payments, require payment_intent_id
        if payment_method == 'card' and 'payment_intent_id' not in data:
            raise serializers.ValidationError({
                'payment_intent_id': 'Payment intent ID is required for card payments'
            })
        
        # Check ticket availability
        if ticket_type.quantity_available is not None and ticket_type.quantity_available < quantity:
            raise serializers.ValidationError({
                'quantity': f'Only {ticket_type.quantity_available} tickets available'
            })
            
        # Check sale period
        from django.utils import timezone
        now = timezone.now()
        if ticket_type.sale_start and now < ticket_type.sale_start:
            raise serializers.ValidationError({'sale_start': 'Ticket sales have not started yet'})
        if ticket_type.sale_end and now > ticket_type.sale_end:
            raise serializers.ValidationError({'sale_end': 'Ticket sales have ended'})
            
        return data
    
    def create(self, validated_data):
        """Create a new ticket purchase"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated to purchase tickets.")
        
        ticket_type = validated_data.pop('ticket_type')
        quantity = validated_data.pop('quantity', 1)
        payment_method = validated_data.pop('payment_method')
        payment_intent_id = validated_data.pop('payment_intent_id', None)
        
        # Calculate total price
        total_price = ticket_type.price * quantity
        
        # Determine initial status based on payment method
        status = 'confirmed'  # Default to confirmed for all payment methods
        if payment_method == 'cash':
            status = 'pending'
        
        # Create the purchase
        purchase = TicketPurchase.objects.create(
            user=request.user,
            ticket_type=ticket_type,
            quantity=quantity,
            payment_method=payment_method,
            total_price=total_price,
            status=status,
            payment_intent_id=payment_intent_id,
            **validated_data
        )
        
        # Update ticket quantity if needed
        if ticket_type.quantity_available is not None:
            ticket_type.quantity_available = max(0, ticket_type.quantity_available - quantity)
            ticket_type.save(update_fields=['quantity_available'])
        
        # Send confirmation email if payment is confirmed
        if status == 'confirmed':
            purchase.send_confirmation_email()
        
        return purchase
        return purchase


class UserTicketSerializer(serializers.ModelSerializer):
    """Serializer for user's ticket list view"""
    event = serializers.SerializerMethodField()
    ticket_type = serializers.StringRelatedField()
    
    class Meta:
        model = TicketPurchase
        fields = [
            'id', 'ticket_type', 'event', 'status', 'quantity',
            'total_price', 'created_at', 'qr_code'
        ]
        read_only_fields = fields
    
    def get_event(self, obj):
        """Get event details"""
        from gallery.serializers import EventSerializer
        return {
            'id': obj.ticket_type.event.id,
            'title': obj.ticket_type.event.title,
            'start_date': obj.ticket_type.event.start_date,
            'end_date': obj.ticket_type.event.end_date,
            'location': obj.ticket_type.event.location,
            'image': obj.ticket_type.event.image.url if obj.ticket_type.event.image else None
        }
