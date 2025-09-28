from rest_framework import serializers
from .models import TicketPurchase
from django.utils import timezone

from gallery.models import Event
from gallery.ticket_models.models import EventTicket, TicketType

class TicketTypeSerializer(serializers.ModelSerializer):
    """Serializer for ticket types"""
    
    class Meta:
        model = TicketType
        fields = [
            'id', 'name', 'description', 'group', 'level', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Add related event_ticket data to the serialized output"""
        representation = super().to_representation(instance)
        
        # Get the related event_ticket for this ticket type
        # We'll use the first active event_ticket if available
        event_ticket = None
        
        # Check if we have an event_id in the context (from the request)
        event_id = self.context.get('request').query_params.get('event_id') if self.context.get('request') else None
        
        if event_id:
            # Try to get the specific event_ticket for this event
            event_ticket = instance.event_tickets.filter(
                event_id=event_id,
                is_active=True
            ).first()
        
        # If no specific event_ticket found, get the first active one
        if not event_ticket:
            event_ticket = instance.event_tickets.filter(
                is_active=True
            ).first()
        
        # Add event_ticket data if available
        if event_ticket:
            representation['price'] = float(event_ticket.price) if event_ticket.price is not None else None
            representation['quantity_available'] = event_ticket.quantity_available
            representation['sale_start'] = event_ticket.sale_start
            representation['sale_end'] = event_ticket.sale_end
            
            # Add event ID
            if event_ticket.event_id:
                representation['event'] = event_ticket.event_id
                
            # Add the actual event_ticket ID
            representation['event_ticket_id'] = event_ticket.id
        
        return representation



class TicketPurchaseSerializer(serializers.ModelSerializer):
    """Serializer for ticket purchases"""
    ticket_type = serializers.SerializerMethodField()
    event = serializers.SerializerMethodField()
    payment_intent_id = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketPurchase
        fields = [
            'id', 'ticket_type', 'event', 'status', 'quantity',
            'payment_method', 'payment_intent_id', 'total_price', 
            'created_at', 'qr_code', 'verification_code', 'event_ticket'
        ]
        read_only_fields = [
            'status', 'total_price', 'created_at', 'qr_code',
            'ticket_type', 'event', 'verification_code', 'event_ticket'
        ]
    
    def get_ticket_type(self, obj):
        if obj.event_ticket and obj.event_ticket.ticket_type:
            return {
                'id': obj.event_ticket.ticket_type.id,
                'name': obj.event_ticket.ticket_type.name,
                'description': obj.event_ticket.ticket_type.description
            }
        return None

    def get_event(self, obj):
        """Get the event details for the purchased ticket"""
        if obj.event_ticket and obj.event_ticket.event:
            event = obj.event_ticket.event
            return {
                'id': event.id,
                'name': event.name, 
                'description': event.description,
                'date': event.date,
                'end_date': event.end_date,
                'location': event.location,
                'privacy': event.privacy,
                'ticket_type': event.ticket_type,
                'cover_image_url': event.cover_image_url,
            }
        return None


    def get_payment_intent_id(self, obj):
        return obj.payment_intent_id



class CreateTicketPurchaseSerializer(serializers.ModelSerializer):
    """Serializer for creating new ticket purchases"""
    event_ticket_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    payment_method = serializers.ChoiceField(choices=TicketPurchase.PAYMENT_METHODS)
    payment_intent_id = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = TicketPurchase
        fields = [
            'event_ticket_id', 
            'quantity', 
            'payment_method', 
            'payment_intent_id'
        ]



    def validate_event_ticket_id(self, value):
        """Validate that the event ticket exists and is active"""
        try:
            return EventTicket.objects.get(id=value, is_active=True)
        except EventTicket.DoesNotExist:
            raise serializers.ValidationError('Invalid event ticket ID or ticket is not active')
    
    def validate(self, data):
        """Validate the ticket purchase"""
        # Get the event ticket instance
        event_ticket = data.get('event_ticket_id')
        if not isinstance(event_ticket, EventTicket):
            raise serializers.ValidationError({
                'event_ticket_id': 'Invalid event ticket'
            })
            
        # Replace the ID with the instance
        data['event_ticket'] = event_ticket
        quantity = data.get('quantity', 1)
        payment_method = data.get('payment_method')
        
        # Validate ticket type
        if not hasattr(event_ticket, 'ticket_type') or not event_ticket.ticket_type:
            raise serializers.ValidationError({
                'event_ticket_id': 'Invalid ticket type for this event ticket'
            })
            
        # Validate ticket availability
        if event_ticket.quantity_available is not None and event_ticket.quantity_available < quantity:
            raise serializers.ValidationError({
                'quantity': f'Only {event_ticket.quantity_available} tickets available for {event_ticket.ticket_type.name}'
            })
            
        # Check sale period
        now = timezone.now()
        if event_ticket.sale_start and now < event_ticket.sale_start:
            raise serializers.ValidationError({
                'sale_start': 'Ticket sales have not started yet'
            })
            
        if event_ticket.sale_end and now > event_ticket.sale_end:
            raise serializers.ValidationError({
                'sale_end': 'Ticket sales have ended'
            })
            
        # Calculate total price
        if event_ticket.price is not None:
            data['total_price'] = float(event_ticket.price) * quantity
        else:
            data['total_price'] = 0
            
        # Validate payment method
        valid_payment_methods = dict(TicketPurchase.PAYMENT_METHODS).keys()
        if payment_method not in valid_payment_methods:
            raise serializers.ValidationError({
                'payment_method': f'Invalid payment method. Must be one of: {", ".join(valid_payment_methods)}'
            })
            
        if payment_method == 'card' and not data.get('payment_intent_id'):
            raise serializers.ValidationError({
                'payment_intent_id': 'Payment intent ID is required for card payments'
            })
            
        return data

        return data

    def create(self, validated_data):
        """Create a new ticket purchase"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated to purchase tickets.")

        event_ticket = validated_data.pop('event_ticket')
        quantity = validated_data.get('quantity', 1)
        payment_method = validated_data.get('payment_method')
        payment_intent_id = validated_data.get('payment_intent_id', '')
        total_price = validated_data.get('total_price', 0)

        # Determine initial status
        status = 'confirmed'
        if payment_method in ['cash', 'pay_on_venue']:
            status = 'pending'

        try:
            purchase = TicketPurchase.objects.create(
                user=request.user,
                event_ticket=event_ticket,
                quantity=quantity,
                payment_method=payment_method,
                payment_intent_id=payment_intent_id,
                total_price=total_price,
                status=status,
            )

            # Update ticket availability
            if event_ticket.quantity_available is not None:
                event_ticket.quantity_available = max(0, event_ticket.quantity_available - quantity)
                event_ticket.save(update_fields=['quantity_available'])

            # Send confirmation email if needed
            if status == 'confirmed' and hasattr(purchase, 'send_confirmation_email'):
                try:
                    purchase.send_confirmation_email()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send confirmation email for purchase {purchase.id}: {str(e)}")

            return purchase

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating ticket purchase: {str(e)}")
            raise serializers.ValidationError(f"Failed to create ticket purchase: {str(e)}")




class UserTicketSerializer(serializers.ModelSerializer):
    """Serializer for user's ticket list view"""
    event = serializers.SerializerMethodField()
    ticket_type = serializers.SerializerMethodField()
    event_ticket_id = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketPurchase
        fields = [
            'id', 'ticket_type', 'event', 'status', 'quantity',
            'total_price', 'created_at', 'qr_code', 'event_ticket_id'
        ]
        read_only_fields = [
            'id', 'status', 'quantity', 'total_price',
            'created_at', 'qr_code'
        ]  # <-- only the actual model fields you want locked
