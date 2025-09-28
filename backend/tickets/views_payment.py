import stripe
import logging
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from gallery.ticket_models.models import EventTicket

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class CreatePaymentIntentView(APIView):
    """
    API endpoint to create a payment intent for ticket purchase.
    This should be called from the frontend before showing the payment form.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        event_ticket_id = request.data.get('event_ticket_id')
        quantity = int(request.data.get('quantity', 1))
        payment_method = request.data.get('payment_method', 'stripe')
        
        if not event_ticket_id or quantity < 1:
            return Response(
                {'detail': 'Event ticket ID and quantity are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # First get the event ticket with related fields to check conditions
                event_ticket = (
                    EventTicket.objects
                    .select_related('event', 'ticket_type')
                    .select_for_update()
                    .get(id=event_ticket_id)
                )
                
                # Check if the event ticket is active and the event hasn't ended
                if not event_ticket.is_active:
                    return Response(
                        {'detail': 'This ticket type is not currently available for purchase'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # Check if the event has ended
                if event_ticket.event.end_date and event_ticket.event.end_date < timezone.now().date():
                    return Response(
                        {'detail': 'This event has already ended'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check ticket availability
                if event_ticket.quantity_available is not None and event_ticket.quantity_available < quantity:
                    return Response(
                        {'detail': f'Only {event_ticket.quantity_available} tickets available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Calculate total amount and ensure it's an integer (Stripe requires amount in cents)
                total_amount = int(float(event_ticket.price) * 100 * quantity)  # Convert to cents for Stripe
                
                # For pay on venue, we don't need a payment intent
                if payment_method == 'pay_on_venue':
                    return Response({
                        'payment_method': 'pay_on_venue',
                        'amount': total_amount / 100,  # Convert back to dollars for display
                        'currency': 'usd',
                        'event_ticket': {
                            'id': event_ticket.id,
                            'name': event_ticket.ticket_type.name,
                            'price': event_ticket.price,
                            'event': {
                                'id': event_ticket.event.id,
                                'title': event_ticket.event.name,  # Changed from title to name
                                'start_date': event_ticket.event.date,  # Using date field instead of start_date
                                'end_date': event_ticket.event.end_date,
                                'location': event_ticket.event.location
                            }
                        },
                        'quantity': quantity,
                        'total': total_amount / 100  # Convert back to dollars for display
                    })
                
                # For online payments, create a Stripe payment intent
                try:
                    # Initialize Stripe with API key
                    stripe.api_key = settings.STRIPE_SECRET_KEY
                    
                    payment_intent = stripe.PaymentIntent.create(
                        amount=total_amount,
                        currency='usd',
                        metadata={
                            'event_ticket_id': str(event_ticket.id),
                            'quantity': quantity,
                            'user_id': str(request.user.id)
                        },
                        receipt_email=request.user.email,
                        automatic_payment_methods={
                            'enabled': True,
                        },
                    )
                    
                    return Response({
                        'payment_method': 'stripe',
                        'client_secret': payment_intent.client_secret,
                        'payment_intent_id': payment_intent.id,
                        'amount': total_amount,
                        'currency': payment_intent.currency,
                        'event_ticket': {
                            'id': event_ticket.id,
                            'name': event_ticket.ticket_type.name,
                            'price': event_ticket.price,
                            'event': {
                                'id': event_ticket.event.id,
                                'title': event_ticket.event.name,  # Changed from title to name
                                'start_date': event_ticket.event.date,  # Using date field instead of start_date
                                'end_date': event_ticket.event.end_date,
                                'location': event_ticket.event.location
                            }
                        },
                        'quantity': quantity,
                        'total': total_amount / 100  # Convert back to dollars for display
                    })
                    
                except stripe.error.StripeError as e:
                    logger.error(f'Stripe error: {str(e)}')
                    return Response(
                        {'detail': str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
        except EventTicket.DoesNotExist:
            return Response(
                {'detail': 'Event ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Error creating payment intent: {str(e)}')
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebhookHandlerView(APIView):
    """
    Handle Stripe webhook events for payment status updates.
    This should be configured in your Stripe dashboard to receive events.
    """
    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            # Verify the webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            logger.error(f"Invalid payload: {str(e)}")
            return Response(status=400)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            logger.error(f"Invalid signature: {str(e)}")
            return Response(status=400)
        
        # Handle the event based on type
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            self.handle_payment_success(payment_intent)
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            self.handle_payment_failure(payment_intent)
        
        return Response({'status': 'success'})
    
    def handle_payment_success(self, payment_intent):
        # Get the event ticket and quantity from metadata
        event_ticket_id = payment_intent.metadata.get('event_ticket_id')
        quantity = int(payment_intent.metadata.get('quantity', 1))
        user_id = payment_intent.metadata.get('user_id')
        
        if not all([event_ticket_id, user_id]):
            logger.error(f'Missing metadata in payment intent: {payment_intent.id}')
            return
        
        try:
            with transaction.atomic():
                # Get the event ticket with a lock
                event_ticket = EventTicket.objects.select_for_update().get(
                    id=event_ticket_id,
                    is_active=True,
                    event__is_active=True
                )
                
                # Double-check availability
                if event_ticket.quantity_available is not None and event_ticket.quantity_available < quantity:
                    logger.error(f'Not enough tickets available for event_ticket {event_ticket_id}')
                    # You might want to issue a refund here
                    return
                
                # Get the user
                User = get_user_model()
                user = User.objects.get(id=user_id)
                
                # Calculate total price based on quantity
                total_price = event_ticket.price * quantity
                
                # Create the purchase
                purchase = TicketPurchase.objects.create(
                    user=user,
                    ticket_type=event_ticket,
                    quantity=quantity,
                    total_price=total_price,
                    status='confirmed',
                    payment_method=payment_intent.get('payment_method_types', ['card'])[0],
                    payment_intent_id=payment_intent.id
                )
                
                # Update ticket availability
                if event_ticket.quantity_available is not None:
                    event_ticket.quantity_available -= quantity
                    event_ticket.save()
                
                # Send confirmation email
                purchase.send_confirmation_email()
                
        except EventTicket.DoesNotExist:
            logger.error(f'EventTicket {event_ticket_id} not found or inactive')
            # Consider issuing a refund if the ticket is no longer available
        except Exception as e:
            logger.error(f'Error processing successful payment {payment_intent.id}: {str(e)}')
            # Consider implementing a retry mechanism or alerting here
    
    def handle_payment_failure(self, payment_intent):
        # Log the failure and potentially notify the user
        logger.warning(f'Payment failed for intent: {payment_intent.id}')
        # You might want to update any pending ticket purchases here
