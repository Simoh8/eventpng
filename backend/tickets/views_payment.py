import logging
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.urls import reverse
from gallery.ticket_models.models import EventTicket

logger = logging.getLogger(__name__)

class CreatePaymentIntentView(APIView):
    """
    API endpoint to create a payment intent for ticket purchase using Paystack.
    This should be called from the frontend before redirecting to Paystack.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        event_id = request.data.get('event_id')
        ticket_type_id = request.data.get('ticket_type_id')
        quantity = int(request.data.get('quantity', 1))
        
        if not all([event_id, ticket_type_id]) or quantity < 1:
            return Response(
                {'error': 'Event ID, ticket type ID, and quantity are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Get the event ticket with related fields
                event_ticket = (
                    EventTicket.objects
                    .select_related('event', 'ticket_type')
                    .select_for_update()
                    .get(id=ticket_type_id, event_id=event_id)
                )
                
                if not event_ticket.is_active:
                    return Response(
                        {'error': 'This ticket type is not currently available for purchase'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if the event has ended
                if event_ticket.event.end_date and event_ticket.event.end_date < timezone.now().date():
                    return Response(
                        {'error': 'This event has already ended'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check ticket availability
                if event_ticket.quantity_available is not None and event_ticket.quantity_available < quantity:
                    return Response(
                        {'error': 'Not enough tickets available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set default currency to USD since it's not stored in the model
                currency = 'USD'
                decimal_places = 2  # USD uses 2 decimal places (cents)
                
                # Calculate amount in the smallest currency unit (cents for USD)
                total_amount = int(event_ticket.price * 100 * quantity)  # Convert to cents
                
                # Prepare Paystack payment data with currency
                reference = f"TKT-{timezone.now().strftime('%Y%m%d')}-{str(request.user.id)[:8]}-{str(ticket_type_id)[:8]}"
                
                # In a real implementation, you would call the Paystack API here
                # For now, we'll return a mock response with the payment URL
                
                # This is where you would typically make a request to Paystack's API
                # response = requests.post(
                #     'https://api.paystack.co/transaction/initialize',
                #     headers={
                #         'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
                #         'Content-Type': 'application/json',
                #     },
                #     json={
                #         'email': request.user.email,
                #         'amount': total_amount,
                #         'reference': reference,
                #         'callback_url': request.build_absolute_uri(
                #             reverse('verify-payment', kwargs={'reference': reference})
                #         ),
                #         'metadata': {
                #             'event_id': event_id,
                #             'ticket_type_id': ticket_type_id,
                #             'quantity': quantity,
                #             'user_id': str(request.user.id)
                #         }
                #     }
                # )
                # 
                # if not response.ok:
                #     logger.error(f'Paystack API error: {response.text}')
                #     raise Exception('Failed to initialize payment with Paystack')
                # 
                # payment_data = response.json()
                
                # Mock response for development
                payment_data = {
                    'status': True,
                    'message': 'Authorization URL created',
                    'data': {
                        'authorization_url': 'https://checkout.paystack.com/mock-payment-url',
                        'access_code': 'mock_access_code',
                        'reference': reference
                    }
                }
                
                return Response({
                    'status': 'success',
                    'message': 'Payment initialized successfully',
                    'data': {
                        'payment_url': payment_data['data']['authorization_url'],
                        'reference': payment_data['data']['reference'],
                        'amount': total_amount,
                        'currency': currency,
                        'metadata': {
                            'event_id': event_id,
                            'ticket_type_id': ticket_type_id,
                            'quantity': quantity,
                            'user_id': str(request.user.id),
                            'currency': currency
                        }
                    }
                })
                
        except EventTicket.DoesNotExist:
            return Response(
                {'error': 'Event ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in CreatePaymentIntentView: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred while processing your payment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebhookHandlerView(APIView):
    """
    Handle Paystack webhook events for payment status updates.
    This should be configured in your Paystack dashboard to receive events.
    """
    def post(self, request, *args, **kwargs):
        payload = request.data
        
        # Verify the webhook signature
        # In a real implementation, you would verify the Paystack signature here
        
        # Handle the event based on type
        event = payload.get('event')
        data = payload.get('data', {})
        
        if event == 'charge.success':
            # Payment was successful
            reference = data.get('reference')
            amount = data.get('amount') / 100  # Convert from kobo to Naira
            metadata = data.get('metadata', {})
            
            # Here you would typically:
            # 1. Find the order/transaction by reference
            # 2. Update the payment status to 'paid'
            # 3. Generate and send tickets to the user
            
            logger.info(f"Payment successful for reference: {reference}")
            
        elif event == 'charge.failed':
            # Payment failed
            reference = data.get('reference')
            logger.warning(f"Payment failed for reference: {reference}")
        
        return Response({'status': 'success'})
