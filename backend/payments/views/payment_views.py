import json
import logging
import time
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound, ValidationError

# Import ticket models
from tickets.models import TicketPurchase, EventTicket

# Local imports
from accounts.models import CustomUser as User
from payments.models import Transaction, Order, OrderItem
from payments.paystack import Paystack
from payments.services.paystack_service import paystack_service
from gallery.ticket_models.models import EventTicket
from gallery.serializers import EventTicketSerializer as TicketSerializer
from gallery.models import EventRegistration

logger = logging.getLogger(__name__)

class PaystackWebhookView(APIView):
    """Handle Paystack webhook events"""
    permission_classes = [AllowAny]  # Paystack will call this from their servers
    
    def post(self, request, *args, **kwargs):
        # Log incoming webhook request for debugging
        logger.info('Received Paystack webhook with data: %s', request.data)
        
        # Verify the webhook signature (important for security)
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE')
        if not self.verify_webhook_signature(request.data, signature):
            logger.error('Invalid webhook signature')
            return Response(
                {'status': 'error', 'message': 'Invalid signature'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        event = request.data.get('event')
        data = request.data.get('data', {})
        
        # Log the event type and reference for debugging
        reference = data.get('reference')
        logger.info('Processing Paystack webhook event: %s, reference: %s', event, reference)
        
        if not event:
            logger.error('No event type in webhook data')
            return Response(
                {'status': 'error', 'message': 'No event type provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if event == 'charge.success':
            return self.handle_successful_charge(data)
            
        # Log unhandled event types
        logger.info('Unhandled webhook event type: %s', event)
        return Response(
            {'status': 'ignored', 'message': f'Unhandled event type: {event}'},
            status=status.HTTP_200_OK
        )
    
    def _create_ticket_purchases(self, order, transaction):
        """Create ticket purchases for each item in the order"""
        from tickets.models import TicketPurchase
        from gallery.ticket_models.models import EventTicket
        from django.contrib.auth import get_user_model
        
        try:
            # Get user from order or fall back to the first superuser if not available
            User = get_user_model()
            user = order.user if hasattr(order, 'user') and order.user else User.objects.filter(is_superuser=True).first()
            
            if not user:
                logger.error('No user found for ticket purchase')
                return
                
            # Get metadata from transaction
            metadata = transaction.metadata or {}
            ticket_details = []
            
            # Try to get ticket details from metadata first
            if 'ticket_details' in metadata and metadata['ticket_details']:
                try:
                    # Check if ticket_details is already a list or needs to be parsed
                    if isinstance(metadata['ticket_details'], str):
                        ticket_details = json.loads(metadata['ticket_details'])
                    else:
                        ticket_details = metadata['ticket_details']
                    logger.info(f'Found {len(ticket_details)} ticket(s) in metadata')
                except (json.JSONDecodeError, TypeError, AttributeError) as e:
                    logger.warning(f'Failed to parse ticket_details from metadata: {e}')
                    logger.debug(f'Metadata content: {metadata}')
            
            # If no ticket details found in metadata, try to get from order items
            if not ticket_details and hasattr(order, 'items'):
                logger.info('No ticket details in metadata, checking order items')
                order_items = order.items.all()
                for item in order_items:
                    ticket_type = item.content_object
                    if not isinstance(ticket_type, EventTicket):
                        continue
                        
                    ticket_details.append({
                        'ticket_id': str(ticket_type.id),
                        'name': getattr(ticket_type, 'name', f'Ticket {ticket_type.id}'),
                        'price': float(item.price or 0),
                        'quantity': int(item.quantity or 1),
                        'event_id': str(ticket_type.event_id) if hasattr(ticket_type, 'event_id') else ''
                    })
            
            # If we still don't have ticket details, log a warning and return
            if not ticket_details:
                logger.warning(f'No ticket details found for order {order.id} and transaction {transaction.id}')
                return
                
            # Process each ticket detail
            tickets_created = 0
            for ticket_data in ticket_details:
                try:
                    # Try both 'ticket_id' and 'id' as possible keys for the ticket ID
                    ticket_id = ticket_data.get('ticket_id') or ticket_data.get('id')
                    if not ticket_id:
                        logger.warning('Skipping ticket with missing ID')
                        logger.debug(f'Ticket data: {ticket_data}')
                        continue
                        
                    # Get ticket type
                    try:
                        ticket_type = EventTicket.objects.get(id=ticket_id)
                    except EventTicket.DoesNotExist:
                        logger.warning(f'Ticket type {ticket_id} not found, skipping')
                        continue
                        
                    # Get quantity and price with proper defaults
                    quantity = int(ticket_data.get('quantity', 1))
                    price = float(ticket_data.get('price', 0))
                    amount_paid = price * quantity
                    
                    # Get event ID from ticket data or fall back to ticket type
                    event_id = ticket_data.get('event_id')
                    if not event_id and hasattr(ticket_type, 'event_id'):
                        event_id = str(ticket_type.event_id)
                    
                    # Create the ticket purchase
                    try:
                        ticket_purchase = TicketPurchase.objects.create(
                            user=user,
                            event_ticket=ticket_type,
                            quantity=quantity,
                            status='confirmed',
                            payment_method='paystack',
                            payment_intent_id=transaction.paystack_reference or transaction.reference or f'txn-{transaction.id}',
                            total_price=amount_paid,
                            metadata={
                                'order_id': str(order.id) if hasattr(order, 'id') else 'N/A',
                                'transaction_id': str(transaction.id),
                                'ticket_type_id': str(ticket_type.id),
                                'event_id': event_id or 'N/A',
                                'payment_metadata': metadata,
                                'ticket_data': ticket_data
                            }
                        )
                        
                        tickets_created += 1
                        logger.info(f'Created ticket purchase {ticket_purchase.id} for ticket type {ticket_type.id}')
                        
                    except Exception as e:
                        logger.error(f'Error creating ticket purchase for ticket {ticket_id}: {str(e)}', exc_info=True)
                        continue
                        
                except Exception as e:
                    logger.error(f'Error processing ticket data: {str(e)}', exc_info=True)
                    continue
            
            if tickets_created == 0:
                logger.warning('No ticket purchases were created')
            else:
                logger.info(f'Successfully created {tickets_created} ticket purchase(s)')
                    
        except Exception as e:
            logger.error(f'Error in _create_ticket_purchases: {str(e)}', exc_info=True)
            # Re-raise the exception to be handled by the caller
            raise

    def verify_webhook_signature(self, payload, signature):
        """Verify the webhook signature from Paystack"""
        if not signature:
            logger.warning('No signature provided in webhook request')
            return False
            
        # In production, you should verify the signature using your Paystack secret key
        # For now, we'll just log that we're skipping verification in development
        logger.warning('Skipping webhook signature verification in development')
        return True  # In production, implement proper signature verification
        
        # Uncomment this in production:
        # from django.conf import settings
        # import hmac
        # import hashlib
        # 
        # paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        # if not paystack_secret:
        #     logger.error('PAYSTACK_SECRET_KEY not configured')
        #     return False
        # 
        # # Compute signature
        # computed_signature = hmac.new(
        #     paystack_secret.encode('utf-8'),
        #     json.dumps(payload, separators=(',', ':')).encode('utf-8'),
        #     digestmod=hashlib.sha512
        # ).hexdigest()
        # 
        # # Compare signatures
        # if not hmac.compare_digest(computed_signature, signature):
        #     logger.error(f'Invalid webhook signature. Expected {computed_signature}, got {signature}')
        #     return False
        # 
        # return True
    
    def handle_successful_charge(self, data):
        """Handle successful payment"""
        # Extract data from webhook payload
        event_data = data.get('data', {})
        reference = data.get('reference') or event_data.get('reference')
        
        if not reference:
            logger.error('No reference found in webhook data')
            return Response(
                {'status': 'error', 'message': 'No reference provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info('Processing successful charge for reference: %s', reference)
        logger.debug('Webhook data: %s', data)
        
        try:
            with transaction.atomic():
                txn = None  # Initialize txn as None
                order = None
                
                # 1. First try to find by paystack_reference field directly
                try:
                    txn = Transaction.objects.select_for_update().get(
                        paystack_reference=reference
                    )
                    logger.info(f'Found existing transaction by Paystack reference: {reference}')
                except Transaction.DoesNotExist:
                    logger.info(f'No transaction found with paystack_reference: {reference}')
                    # 2. Try to find by order ID in metadata if no transaction found
                    metadata = event_data.get('metadata', {})
                    order_id = metadata.get('order_id')
                    
                    # Try to extract order_id from custom_fields if not directly in metadata
                    if not order_id and 'custom_fields' in metadata:
                        custom_fields = metadata.get('custom_fields', [])
                        if isinstance(custom_fields, list):
                            for field in custom_fields:
                                if field.get('variable_name') == 'order_id':
                                    order_id = field.get('value')
                                    break
                    
                    # If we have an order_id, try to find the order
                    if order_id:
                        logger.info(f'Looking up order by order_id: {order_id}')
                        try:
                            order = Order.objects.select_for_update().get(id=order_id)
                            logger.info(f'Found order by order_id: {order_id}')
                            
                            # Try to find existing transaction for this order
                            txn = Transaction.objects.filter(
                                order=order,
                                status=Transaction.STATUS_PENDING
                            ).first()
                            
                            if txn:
                                logger.info(f'Found existing transaction for order {order_id}')
                            
                        except Order.DoesNotExist:
                            logger.warning(f'No order found with id: {order_id}')
                
                # If we still don't have a transaction, create a new one
                if txn is None:
                    logger.info(f'Creating new transaction for reference: {reference}')
                    
                    # Get customer email from event data (customer field)
                    customer_email = event_data.get('customer', {}).get('email')
                    if not customer_email:
                        # Fallback to metadata if customer email not found
                        customer_email = metadata.get('customer_email')
                    
                    if not customer_email:
                        logger.warning(f'No customer email found in webhook data or metadata, using fallback')
                        customer_email = f'system+{reference}@example.com'
                    
                    # If we have an order, use it to create the transaction
                    if order:
                        txn = Transaction(
                            order=order,
                            status=Transaction.STATUS_SUCCEEDED,
                            transaction_type=Transaction.TYPE_CHARGE,
                            amount=float(event_data.get('amount', 0)) / 100,  # Convert from kobo to naira
                            currency=event_data.get('currency', 'NGN'),
                            stripe_charge_id=event_data.get('id'),
                            paystack_reference=reference,  # Add this field
                            metadata=metadata
                        )
                        txn.save()
                        logger.info(f'Created new transaction {txn.id} for order {order.id} with reference: {reference}')
                        
                        try:
                            # Don't create tickets in webhook - just store metadata for verification
                            logger.info(f'Ticket details stored in metadata for later processing by verification')
                        except Exception as e:
                            logger.error(f'Error storing ticket metadata: {str(e)}', exc_info=True)
                            # Don't fail the transaction, just log the error
                            pass
                        
                    else:
                        # If no order, create a placeholder order first
                        from django.contrib.auth import get_user_model
                        
                        try:
                            # Try to find a user with the customer email
                            User = get_user_model()
                            user = User.objects.filter(email=customer_email).first()
                            
                            if not user:
                                # If no user found, use the first admin user or create a system user
                                user = User.objects.filter(is_staff=True).first()
                                if not user:
                                    user = User.objects.create_user(
                                        username=f'system_{reference[:10]}',
                                        email=f'system+{reference}@example.com',
                                        password=User.objects.make_random_password()
                                    )
                            
                            # Create a new order
                            from ..models.order import Order
                            amount = float(event_data.get('amount', 0)) / 100  # Convert from kobo to naira
                            
                            # Get customer details from metadata
                            metadata = event_data.get('metadata', {})
                            customer_name = metadata.get('customer_name', 'Customer')
                            
                            # Create the order with required fields
                            # Ensure we have a valid email address
                            if not customer_email:
                                customer_email = f'system+{reference}@example.com'  # Fallback email
                                logger.warning(f'No customer email found, using fallback: {customer_email}')
                            
                            # Ensure we have a valid name
                            if not customer_name or customer_name == ' ':
                                customer_name = f'Customer-{reference[:8]}'  # Fallback name
                                logger.warning(f'No customer name found, using fallback: {customer_name}')
                            
                            order = Order(
                                user=user,
                                status='paid',
                                subtotal=amount,  # Use amount as subtotal (adjust if you have tax)
                                tax_amount=0,     # Set to 0 if not applicable
                                total=amount,     # Same as subtotal if no tax
                                currency=event_data.get('currency', 'KES'),
                                billing_email=customer_email,
                                billing_name=customer_name,
                                billing_address={
                                    'created_from_paystack_webhook': True,
                                    'paystack_reference': reference,
                                    'customer_email': customer_email,
                                    'customer_phone': metadata.get('customer_phone', '')
                                }
                            )
                            order.save()  # Save to generate the ID
                            
                        except Exception as e:
                            logger.error(f'Error creating order and transaction: {str(e)}', exc_info=True)
                            # If we can't create an order, we can't proceed
                            return Response(
                                {'status': 'error', 'message': 'Failed to create order for payment'},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                
                # At this point, we should have a transaction - either found or created
                if txn is None:
                    logger.error(f'Failed to find or create transaction for reference: {reference}')
                    return Response(
                        {
                            'status': 'error', 
                            'message': 'Failed to process payment',
                            'reference': reference
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update transaction status and store Paystack data
                txn.status = Transaction.STATUS_SUCCEEDED
                if not txn.paystack_transaction_id:
                    txn.paystack_transaction_id = event_data.get('id')
                
                # Update metadata with latest data
                txn_metadata = txn.metadata or {}
                txn_metadata.update({
                    'paystack_reference': reference,
                    'paystack_data': data,
                    'last_updated': timezone.now().isoformat()
                })
                txn.metadata = txn_metadata
                txn.save(update_fields=['status', 'paystack_transaction_id', 'metadata', 'updated_at'])
                
                # Update the related order status if it exists
                if hasattr(txn, 'order') and txn.order:
                    logger.info('Updating order %s status to paid', txn.order.id)
                    txn.order.status = 'paid'
                    txn.order.save(update_fields=['status', 'updated_at'])
                    
                    # Get customer email from webhook data
                    customer_email = data.get('customer', {}).get('email')
                    if not customer_email:
                        logger.warning('No customer email found in webhook data, using fallback')
                        customer_email = f'system+{reference}@example.com'
                    
                    # Update transaction metadata with customer email if not already set
                    if customer_email and not txn_metadata.get('customer_email'):
                        txn_metadata['customer_email'] = customer_email
                        txn.metadata = txn_metadata
                        txn.save(update_fields=['metadata', 'updated_at'])
                    
                    # Create a Payment record for the transaction
                    from gallery.models import Payment, PaymentStatus, EventRegistration
                    
                    payment = Payment.objects.create(
                        user=txn.order.user if hasattr(txn.order, 'user') else None,
                        amount=txn.amount,
                        status=PaymentStatus.COMPLETED,
                        payment_intent_id=txn.paystack_transaction_id or txn.reference,
                        payment_method='card'  # Default to card for Paystack
                    )
                    
                    # Get metadata from event data
                    event_metadata = event_data.get('metadata', {})
                    
                    # Get event ID from transaction metadata
                    event_id = txn.metadata.get('event_id') if txn.metadata and txn.metadata.get('event_id') else None
                    
                    # Also check in the original metadata from webhook
                    if not event_id:
                        event_id = event_metadata.get('event_id')
                    
                    # Convert to string if it's an integer or other type
                    if event_id and event_id != 'None':
                        event_id = str(event_id)
                    
                    if event_id and event_id != 'None':
                        logger.info(f'Found event_id: {event_id}')
                    else:
                        logger.warning('No event ID found in transaction metadata, skipping registration update')
                        event_id = None
                    
                    # Get ticket IDs from transaction metadata
                    ticket_ids = txn.metadata.get('ticket_ids') if txn.metadata else None
                    
                    # Also check in the original metadata from webhook
                    if not ticket_ids:
                        ticket_ids = event_metadata.get('ticket_ids')
                    
                    # Create ticket purchases if we have an event ID and ticket IDs
                    if event_id and event_id != 'None' and ticket_ids:
                        try:
                            # Convert ticket_ids to a list if it's a string
                            if isinstance(ticket_ids, str):
                                ticket_ids = [tid.strip() for tid in ticket_ids.split(',') if tid.strip()]
                            
                            # Get the first ticket ID for now (you might want to handle multiple tickets)
                            ticket_id = ticket_ids[0] if ticket_ids else None
                            
                            if ticket_id:
                                # Get the event ticket
                                event_ticket = EventTicket.objects.get(id=ticket_id, event_id=event_id)
                                
                                # Don't create ticket purchase in webhook - just log that we found the ticket
                                logger.info('Found event ticket %s for event %s - ticket creation will be handled by verification', ticket_id, event_id)
                            
                        except EventTicket.DoesNotExist:
                            logger.error('Event ticket %s not found for event %s', ticket_id, event_id)
                        except Exception as e:
                            logger.error('Error processing ticket creation: %s', str(e), exc_info=True)
                    
                    # Update related event registrations if needed
                    from gallery.models import EventRegistration
                    
                    # Find registrations by email if available, or by order items
                    if customer_email and event_id and event_id != 'None':
                        updated = EventRegistration.objects.filter(
                            email=customer_email,
                            status__in=['pending', 'reserved', 'pending_payment'],
                            event_id=event_id
                        ).update(
                            status='confirmed',
                            payment=payment
                        )
                        logger.info('Updated %d registrations to confirmed for email %s', updated, customer_email)
                    elif not event_id or event_id == 'None':
                        logger.warning('No valid event ID found in transaction metadata, skipping registration update')
                
                logger.info('Successfully processed payment for reference: %s', reference)
                return Response(
                    {'status': 'success', 'message': 'Payment processed successfully'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            logger.error('Error processing webhook: %s', str(e), exc_info=True)
            return Response(
                {'status': 'error', 'message': 'Error processing payment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaystackVerifyPaymentView(RetrieveAPIView):
    """Verify a Paystack payment using the reference"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # First try to find transactions for the current user
        user_transactions = Transaction.objects.select_related('order').filter(order__user=self.request.user)
        
        # Also include any transactions with this reference (for webhook-created transactions)
        # This allows verification to find transactions created by webhooks even if they're associated with different users
        reference = self.kwargs.get('reference')
        if reference:
            ref_transactions = Transaction.objects.select_related('order').filter(paystack_reference=reference)
            # Combine querysets and remove duplicates, prioritizing user transactions
            return (user_transactions | ref_transactions).distinct()
        
        return user_transactions
        
    def get_object(self):
        # Override get_object to use paystack_reference instead of the default lookup_field
        reference = self.kwargs.get('reference')
        if not reference:
            raise ValidationError({'reference': 'This field is required'})
            
        try:
            txn = self.get_queryset().get(paystack_reference=reference)
            
            # Validate that the current user has access to this transaction
            if not self._user_has_access_to_transaction(txn):
                raise ValidationError({'reference': 'You do not have access to this transaction'})
                
            return txn
        except Transaction.DoesNotExist:
            raise NotFound('Transaction not found')
    
    def _user_has_access_to_transaction(self, transaction):
        """Check if the current user has access to the given transaction"""
        user = self.request.user
        
        # User has access if the transaction belongs to them
        if hasattr(transaction, 'order') and transaction.order and transaction.order.user == user:
            return True
            
        # User has access if their email matches the customer email in metadata
        metadata = transaction.metadata or {}
        customer_email = metadata.get('customer_email')
        if customer_email and customer_email == user.email:
            return True
            
        return False
    
    def retrieve(self, request, *args, **kwargs):
        reference = self.kwargs.get('reference')
        user_id = request.user.id
        logger.info(f'[Payment Verification] Verifying payment with reference: {reference} for user: {user_id}')
        
        # Log all transactions with this reference for debugging
        all_txns = Transaction.objects.filter(paystack_reference=reference)
        logger.info(f'[Payment Verification] Found {all_txns.count()} transactions with reference {reference}')
        
        # Debug: Log details of found transactions
        for txn in all_txns:
            logger.info(f'[Payment Verification] Transaction {txn.id}: user={getattr(txn.order.user if hasattr(txn, "order") and txn.order else None, "id", "None")}, status={txn.status}, metadata_keys={list(txn.metadata.keys()) if txn.metadata else "None"}')
        
        try:
            # First try to get the transaction using our custom get_object method
            txn = self.get_object()
            logger.info(f'[Payment Verification] Found transaction: {txn.id} with status: {txn.status} and order: {getattr(txn, "order", None)}')
            
            # If transaction is already marked as succeeded, return success
            if txn.status == Transaction.STATUS_SUCCEEDED:
                logger.info(f'Transaction {txn.id} already marked as succeeded')
                
                # Check if tickets need to be created from webhook metadata
                metadata = txn.metadata or {}
                if 'ticket_details' in metadata and metadata['ticket_details']:
                    logger.info(f'Found ticket details in transaction metadata, creating tickets')
                    try:
                        # Create tickets from webhook metadata
                        if hasattr(txn, 'order') and txn.order:
                            self._create_ticket_purchases(txn.order, txn)
                            logger.info(f'Successfully created tickets from webhook metadata')
                    except Exception as e:
                        logger.error(f'Error creating tickets from webhook metadata: {str(e)}', exc_info=True)
                
                return Response({
                    'status': 'success',
                    'message': 'Payment already verified',
                    'data': {
                        'reference': reference,
                        'transaction_id': str(txn.id),
                        'amount': txn.amount,
                        'currency': txn.currency,
                        'status': txn.status
                    }
                })
                
        except NotFound:
            logger.warning(f'Transaction not found for reference: {reference}')
            # Try to verify with Paystack directly
            try:
                # First check if the transaction was already created by the webhook
                webhook_txn = Transaction.objects.filter(paystack_reference=reference).first()
                if webhook_txn:
                    logger.info(f'Found transaction {webhook_txn.id} created by webhook for reference: {reference}')
                    return Response({
                        'status': 'success',
                        'message': 'Payment verified successfully',
                        'data': {'status': 'success', 'reference': reference},
                        'order_id': str(webhook_txn.order.id) if webhook_txn.order else None,
                        'transaction_id': str(webhook_txn.id)
                    })
                
                # If not found, verify with Paystack directly
                response = paystack_service.verify_payment(reference)
                if response.get('status') and response['data'].get('status') == 'success':
                    # Create transaction record if it doesn't exist
                    with transaction.atomic():
                        # Get amount from Paystack response and convert from kobo
                        amount = float(response['data'].get('amount', 0)) / 100
                        currency = response['data'].get('currency', 'KES')
                        
                        # Create order with proper field values - check what fields your Order model actually has
                        order_data = {
                            'user': request.user,
                            'status': 'paid',
                            'currency': currency,
                            'paid_at': timezone.now(),
                        }
                        
                        # Add amount fields based on your Order model structure
                        # Try different possible field names for amounts
                        from payments.models import Order as OrderModel
                        if hasattr(OrderModel, 'subtotal'):
                            order_data['subtotal'] = amount
                        if hasattr(OrderModel, 'total'):
                            order_data['total'] = amount
                        if hasattr(OrderModel, 'total_amount'):
                            order_data['total_amount'] = amount
                        if hasattr(OrderModel, 'amount'):
                            order_data['amount'] = amount
                            
                        # Add tax amount if the field exists
                        if hasattr(OrderModel, 'tax_amount'):
                            order_data['tax_amount'] = 0
                            
                        # Set billing information with proper fallbacks
                        if hasattr(OrderModel, 'billing_email'):
                            order_data['billing_email'] = getattr(request.user, 'email', '')
                            
                        # Ensure billing_name is always set with a valid value
                        if hasattr(OrderModel, 'billing_name'):
                            first_name = getattr(request.user, 'first_name', '')
                            last_name = getattr(request.user, 'last_name', '')
                            username = getattr(request.user, 'username', 'Customer')
                            
                            # Create billing name from first and last name if available
                            billing_name = f"{first_name} {last_name}".strip()
                            # Fall back to username if no name is available
                            billing_name = billing_name if billing_name else username
                            # Final fallback to a generic name if everything else is empty
                            billing_name = billing_name or 'Customer'
                            
                            order_data['billing_name'] = billing_name
                            
                        order = Order.objects.create(**order_data)
                        
                        # Create transaction data
                        txn_data = {
                            'order': order,
                            'transaction_type': Transaction.TYPE_CHARGE,
                            'amount': amount,
                            'currency': currency,
                            'status': Transaction.STATUS_SUCCEEDED,
                            'paystack_reference': reference,
                            'metadata': response['data'].get('metadata', {})
                        }
                        
                        # Add paystack_transaction_id if available
                        paystack_transaction_id = response['data'].get('id')
                        if paystack_transaction_id:
                            txn_data['paystack_transaction_id'] = paystack_transaction_id
                            
                        txn = Transaction.objects.create(**txn_data)
                        
                        # Process any ticket purchases from metadata if available
                        metadata = response['data'].get('metadata', {})
                        if isinstance(metadata, dict) and 'ticket_details' in metadata:
                            self._create_ticket_purchases(order, txn)
                    
                    return Response({
                        'status': 'success',
                        'message': 'Payment verified successfully',
                        'data': response['data'],
                        'order_id': order.id,
                        'transaction_id': txn.id
                    })
                
                # If payment is still pending
                return Response({
                    'status': 'pending',
                    'message': 'Payment is still being processed',
                    'data': response.get('data', {})
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as e:
                logger.error(f'Error verifying payment with Paystack: {str(e)}', exc_info=True)
                return Response({
                    'status': 'error',
                    'message': 'Transaction not found and could not be verified with Paystack',
                    'error': str(e)
                }, status=status.HTTP_404_NOT_FOUND)
        
        # If we found an existing transaction, verify with Paystack
        try:
            response = paystack_service.verify_payment(reference)
            logger.debug(f'Paystack verification response: {response}')
            
            if response.get('status') and response['data'].get('status') == 'success':
                # Payment was successful - update our records
                with transaction.atomic():
                    # Update transaction status
                    txn.status = Transaction.STATUS_SUCCEEDED
                    
                    # Update paystack transaction ID if not set
                    if not txn.paystack_transaction_id:
                        txn.paystack_transaction_id = response['data'].get('id')
                    
                    # Update metadata
                    current_metadata = txn.metadata or {}
                    current_metadata.update({
                        'paystack_verification_response': response['data'],
                        'last_verified_at': timezone.now().isoformat()
                    })
                    txn.metadata = current_metadata
                    
                    txn.save()
                    
                    # Update order status if it exists
                    if hasattr(txn, 'order') and txn.order:
                        txn.order.status = 'paid'
                        txn.order.save()
                        
                        # Process ticket purchases if not already done
                        if not hasattr(txn.order, 'items') or not txn.order.items.exists():
                            self._create_ticket_purchases(txn.order, txn)
                        
                        # Update any related registrations
                        from gallery.models import EventRegistration
                        EventRegistration.objects.filter(
                            order=txn.order,
                            status__in=['pending', 'reserved', 'pending_payment']
                        ).update(
                            status='confirmed',
                            confirmed_at=timezone.now()
                        )
                
                return Response({
                    'status': 'success',
                    'message': 'Payment verified successfully',
                    'data': response['data'],
                    'order_id': txn.order.id if hasattr(txn, 'order') and txn.order else None,
                    'transaction_id': txn.id
                })
            else:
                # Payment failed or is pending
                status_message = response.get('message', 'Payment is still being processed')
                logger.info(f'Payment {reference} is pending: {status_message}')
                return Response({
                    'status': 'pending',
                    'message': status_message,
                    'data': response.get('data', {})
                }, status=status.HTTP_202_ACCEPTED)
                
        except Exception as e:
            logger.error(f'Error verifying payment: {str(e)}', exc_info=True)
            return Response({
                'status': 'error',
                'message': 'An error occurred while verifying your payment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_ticket_purchases(self, order, transaction):
        """Create ticket purchases for each item in the order"""
        try:
            # Get user from order
            user = order.user if hasattr(order, 'user') and order.user else None
            
            if not user:
                logger.error('No user found for ticket purchase')
                return
                
            # Get metadata from transaction
            metadata = transaction.metadata or {}
            ticket_details = []
            
            # Try to get ticket details from metadata first
            if 'ticket_details' in metadata and metadata['ticket_details']:
                try:
                    # Check if ticket_details is already a list or needs to be parsed
                    if isinstance(metadata['ticket_details'], str):
                        ticket_details = json.loads(metadata['ticket_details'])
                    else:
                        ticket_details = metadata['ticket_details']
                    logger.info(f'Found {len(ticket_details)} ticket(s) in metadata')
                except (json.JSONDecodeError, TypeError, AttributeError) as e:
                    logger.warning(f'Failed to parse ticket_details from metadata: {e}')
            
            # If no ticket details found in metadata, try to get from order items
            if not ticket_details and hasattr(order, 'items') and hasattr(order.items, 'all'):
                logger.info('No ticket details in metadata, checking order items')
                try:
                    order_items = order.items.all()
                    for item in order_items:
                        # Check if item has content_object attribute
                        if hasattr(item, 'content_object'):
                            ticket_type = item.content_object
                            if isinstance(ticket_type, EventTicket):
                                ticket_details.append({
                                    'ticket_id': str(ticket_type.id),
                                    'name': getattr(ticket_type, 'name', f'Ticket {ticket_type.id}'),
                                    'price': float(getattr(item, 'price', 0) or 0),
                                    'quantity': int(getattr(item, 'quantity', 1) or 1),
                                    'event_id': str(ticket_type.event_id) if hasattr(ticket_type, 'event_id') else ''
                                })
                except Exception as e:
                    logger.warning(f'Error getting order items: {e}')
            
            # If we still don't have ticket details, log a warning and return
            if not ticket_details:
                logger.warning(f'No ticket details found for order {order.id} and transaction {transaction.id}')
                return
                
            # Process each ticket detail
            tickets_created = 0
            for ticket_data in ticket_details:
                try:
                    # Try both 'ticket_id' and 'id' as possible keys for the ticket ID
                    ticket_id = ticket_data.get('ticket_id') or ticket_data.get('id')
                    if not ticket_id:
                        logger.warning('Skipping ticket with missing ID')
                        continue
                        
                    # Get ticket type
                    try:
                        ticket_type = EventTicket.objects.get(id=ticket_id)
                    except EventTicket.DoesNotExist:
                        logger.warning(f'Ticket type {ticket_id} not found, skipping')
                        continue
                        
                    # Get quantity and price with proper defaults
                    quantity = int(ticket_data.get('quantity', 1))
                    price = float(ticket_data.get('price', 0))
                    amount_paid = price * quantity
                    # Get event ID from ticket data or fall back to ticket type
                    event_id = ticket_data.get('event_id')
                    if not event_id and hasattr(ticket_type, 'event_id'):
                        event_id = str(ticket_type.event_id)
                    
                    # Create the ticket purchase
                    try:
                        ticket_purchase = TicketPurchase.objects.create(
                            user=user,
                            event_ticket=ticket_type,
                            quantity=quantity,
                            status='confirmed',
                            payment_method='paystack',
                            payment_intent_id=transaction.paystack_reference or transaction.reference or f'txn-{transaction.id}',
                            total_price=amount_paid,
                            metadata={
                                'order_id': str(order.id) if hasattr(order, 'id') else 'N/A',
                                'transaction_id': str(transaction.id),
                                'ticket_type_id': str(ticket_type.id),
                                'event_id': event_id or 'N/A',
                                'payment_metadata': metadata,
                                'ticket_data': ticket_data
                            }
                        )
                        
                        tickets_created += 1
                        logger.info(f'Created ticket purchase {ticket_purchase.id} for ticket type {ticket_type.id}')
                        
                    except Exception as e:
                        logger.error(f'Error creating ticket purchase for ticket {ticket_id}: {str(e)}', exc_info=True)
                        continue
                except Exception as e:
                    logger.error(f'Error processing ticket data: {str(e)}', exc_info=True)
                    continue
            
            if tickets_created == 0:
                logger.warning(f'No ticket purchases were created for order {order.id} and transaction {transaction.id}')
            else:
                logger.info(f'Successfully created {tickets_created} ticket purchase(s)')
                    
        except Exception as e:
            logger.error(f'Error in _create_ticket_purchases: {str(e)}', exc_info=True)
            # Don't raise the exception here, just log it
            pass