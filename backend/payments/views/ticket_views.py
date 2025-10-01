from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
import uuid

from ..models import Order, OrderItem, Transaction
from ..services.paystack_service import paystack_service
from gallery.ticket_models.models import EventTicket
from gallery.models import EventRegistration

class CreateTicketPaymentView(generics.CreateAPIView):
    """Create a Paystack payment for event tickets"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        event_id = request.data.get('event_id')
        ticket_type_id = request.data.get('ticket_type_id')
        quantity = int(request.data.get('quantity', 1))
        
        if not all([event_id, ticket_type_id]):
            return Response(
                {'error': 'Missing required fields'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Get or create the ticket type
                try:
                    ticket_type = EventTicket.objects.get(
                        id=ticket_type_id,
                        event_id=event_id,
                        is_active=True
                    )
                except EventTicket.DoesNotExist:
                    return Response(
                        {'error': 'Invalid ticket type'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check ticket availability
                if ticket_type.quantity_available is not None and ticket_type.quantity_available < quantity:
                    return Response(
                        {'error': 'Not enough tickets available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Calculate total amount
                total_amount = ticket_type.price * quantity * 100  # Convert to kobo
                
                # Create order
                order = Order.objects.create(
                    user=request.user,
                    total_amount=total_amount / 100,  # Convert back to naira
                    status=Order.STATUS_PENDING
                )
                
                # Create order item
                OrderItem.objects.create(
                    order=order,
                    content_type=EventTicket,
                    object_id=ticket_type.id,
                    quantity=quantity,
                    unit_price=ticket_type.price
                )
                
                # Create transaction
                reference = f"TKT-{uuid.uuid4().hex.upper()}"
                txn = Transaction.objects.create(
                    order=order,
                    amount=total_amount / 100,  # Convert back to naira
                    payment_method='paystack',
                    status=Transaction.STATUS_PENDING,
                    reference=reference,
                    user=request.user
                )
                
                # Create event registration (pending payment)
                for _ in range(quantity):
                    EventRegistration.objects.create(
                        event=ticket_type.event,
                        user=request.user,
                        ticket_type=ticket_type,
                        order=order,
                        status='pending_payment'
                    )
                
                # Generate Paystack payment link
                callback_url = request.build_absolute_uri(
                    f'/api/payments/paystack/verify/{reference}/'
                )
                
                payment_link = paystack_service.get_payment_link(
                    amount=total_amount,
                    email=request.user.email,
                    reference=reference,
                    callback_url=callback_url,
                    metadata={
                        'order_id': str(order.id),
                        'user_id': str(request.user.id),
                        'event_id': str(event_id),
                        'ticket_type_id': str(ticket_type_id),
                        'quantity': quantity
                    }
                )
                
                if not payment_link:
                    raise Exception('Failed to generate payment link')
                
                return Response({
                    'payment_url': payment_link,
                    'reference': reference,
                    'order_id': str(order.id)
                })
                
        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating ticket payment: {str(e)}")
            
            return Response(
                {'error': 'Failed to process payment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
