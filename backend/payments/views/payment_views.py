from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from ..services.paystack_service import paystack_service
from ..models import Transaction, Order, OrderItem
from gallery.ticket_models.models import EventTicket
from gallery.models import EventRegistration

class PaystackWebhookView(APIView):
    """Handle Paystack webhook events"""
    permission_classes = [AllowAny]  # Paystack will call this from their servers
    
    def post(self, request, *args, **kwargs):
        # Verify the webhook signature (important for security)
        # Note: Implement signature verification in production
        
        event = request.data.get('event')
        data = request.data.get('data', {})
        
        if event == 'charge.success':
            return self.handle_successful_charge(data)
        
        return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
    
    def handle_successful_charge(self, data):
        """Handle successful payment"""
        reference = data.get('reference')
        
        # Find the transaction in our database
        try:
            with transaction.atomic():
                # Get the transaction
                txn = Transaction.objects.select_for_update().get(
                    reference=reference,
                    status=Transaction.STATUS_PENDING
                )
                
                # Update transaction status
                txn.status = Transaction.STATUS_COMPLETED
                txn.payment_reference = data.get('reference')
                txn.payment_data = data
                txn.paid_at = timezone.now()
                txn.save()
                
                # Update the related order status
                if hasattr(txn, 'order'):
                    txn.order.status = Order.STATUS_PAID
                    txn.order.paid_at = timezone.now()
                    txn.order.save()
                    
                    # Update any related registrations
                    EventRegistration.objects.filter(
                        order=txn.order,
                        status='pending_payment'
                    ).update(status='confirmed')
                
                return Response({'status': 'success'}, status=status.HTTP_200_OK)
                
        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found or already processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error processing Paystack webhook: {str(e)}")
            
            return Response(
                {'error': 'Error processing payment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaystackVerifyPaymentView(APIView):
    """Verify a Paystack payment from the frontend and update ticket purchase records"""
    permission_classes = [AllowAny]  # Or use IsAuthenticated if needed
    
    def get(self, request, reference, *args, **kwargs):
        try:
            # Find the transaction in our database
            try:
                txn = Transaction.objects.select_related('order').get(
                    reference=reference
                )
            except Transaction.DoesNotExist:
                return Response(
                    {'error': 'Transaction not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify the payment with Paystack
            response = paystack_service.verify_payment(reference)
            
            if response.get('status') and response['data'].get('status') == 'success':
                # Payment was successful - update our records
                with transaction.atomic():
                    # Update transaction status
                    txn.status = Transaction.STATUS_COMPLETED
                    txn.payment_reference = response['data'].get('reference')
                    txn.payment_data = response['data']
                    txn.paid_at = timezone.now()
                    txn.save()
                    
                    # Update order status
                    if hasattr(txn, 'order'):
                        txn.order.status = Order.STATUS_PAID
                        txn.order.paid_at = timezone.now()
                        txn.order.save()
                        
                        # Update event registrations
                        EventRegistration.objects.filter(
                            order=txn.order,
                            status='pending_payment'
                        ).update(status='confirmed')
                
                return Response({
                    'status': 'success',
                    'message': 'Payment verified and ticket purchase recorded',
                    'data': response['data']
                })
            else:
                # Payment failed or is pending
                return Response({
                    'status': 'error',
                    'message': 'Payment verification failed',
                    'data': response.get('data', {})
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error verifying payment: {str(e)}")
            
            return Response({
                'status': 'error',
                'message': 'An error occurred while verifying your payment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
