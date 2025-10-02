from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
import logging

from ..models import Event, EventRegistration
from ..ticket_models.models import EventTicket, TicketType

logger = logging.getLogger(__name__)
User = get_user_model()
from ..serializers import (
    TicketTypeSerializer,
    EventTicketSerializer,
    EventWithTicketsSerializer,
    EventTicketListSerializer
)

class TicketViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing event tickets.
    """
    serializer_class = TicketTypeSerializer
    permission_classes = [IsAdminUser]  # Only admins can manage tickets
    
    def get_queryset(self):
        """Return tickets for the specified event."""
        event_id = self.kwargs.get('event_pk')
        return EventTicket.objects.filter(event_id=event_id).select_related('event', 'ticket_type')
    
    def perform_create(self, serializer):
        """Create a new ticket for an event."""
        event = get_object_or_404(Event, pk=self.kwargs['event_pk'])
        serializer.save(event=event)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def available(self, request, event_pk=None, pk=None):
        """Check if a ticket is available for purchase."""
        ticket = self.get_object()
        return Response({
            'is_available': ticket.is_available(),
            'available_quantity': ticket.available_quantity,
            'sale_period': {
                'start': ticket.sale_start,
                'end': ticket.sale_end,
                'is_active': ticket.is_available()
            }
        })


class PublicTicketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API endpoint for viewing available tickets.
    """
    serializer_class = TicketTypeSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Return only available tickets for the specified event."""
        event_id = self.kwargs.get('event_pk')
        now = timezone.now()
        
        return EventTicket.objects.filter(
            event_id=event_id,
            is_active=True,
            event__has_tickets=True,
            event__date__gte=now.date()  # Only future events
        ).select_related('event')


class TicketPurchaseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for purchasing tickets.
    """
    serializer_class = EventTicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return ticket registrations for the current user."""
        return EventRegistration.objects.filter(user=self.request.user).select_related('event', 'ticket')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new ticket registration."""
        # Get the ticket
        ticket_id = request.data.get('ticket')
        if not ticket_id:
            return Response(
                {'error': 'Ticket ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        ticket = get_object_or_404(EventTicket, id=ticket_id, is_active=True)
        
        # Check if ticket is available
        if not ticket.remaining_quantity or ticket.remaining_quantity <= 0:
            return Response(
                {'error': 'This ticket is sold out'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not ticket.is_available():
            return Response(
                {'error': 'This ticket is not currently available for purchase'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the registration
        registration_data = {
            'event': ticket.event.id,
            'ticket': ticket.id,
            'user': request.user.id,
            'email': request.user.email,
            'first_name': request.data.get('first_name', request.user.first_name or ''),
            'last_name': request.data.get('last_name', request.user.last_name or ''),
            'status': 'pending'  # Will be confirmed after payment
        }
        
        serializer = self.get_serializer(data=registration_data)
        serializer.is_valid(raise_exception=True)
        
        # In a real app, you would process payment here
        # For now, we'll just create the registration
        registration = serializer.save()
        
        # In a real app, you would redirect to payment processing
        # For now, we'll just mark as confirmed
        registration.status = 'confirmed'
        registration.save()
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a ticket registration (if allowed)."""
        registration = self.get_object()
        
        # Check if cancellation is allowed
        if registration.status != 'confirmed':
            return Response(
                {'error': 'Only confirmed registrations can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # In a real app, you would process a refund here if applicable
        # For now, we'll just update the status
        registration.status = 'cancelled'
        registration.save()
        
        return Response({'status': 'cancelled'})


class EventWithTicketsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing events with ticket information.
    """
    serializer_class = EventWithTicketsSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Return events that have tickets available for purchase."""
        now = timezone.now()
        
        # Get events with active tickets
        return Event.objects.filter(
            has_tickets=True,
            date__gte=now.date(),  # Only future events
            event_tickets__is_active=True,
            event_tickets__sale_end__gte=now,  # Only tickets that are still on sale
            event_tickets__quantity_available__gt=0  # Only tickets with available quantity
        ).prefetch_related(
            'event_tickets',
            'event_tickets__ticket_type',
            'event_tickets__ticket_type__group',
            'event_tickets__ticket_type__level',
            'covers'  # Prefetch cover images
        ).distinct()
        
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['POST'])
@permission_classes([AllowAny])
def register_tickets(request):
    """
    Register one or more tickets for an event.
    """
    try:
        data = request.data
        customer_data = data.get('customer', {})
        tickets_data = data.get('tickets', [])
        is_paid = data.get('is_paid', False)
        payment_reference = data.get('payment_reference')

        if not tickets_data:
            return Response(
                {'error': 'No tickets provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user
        user = None
        if request.user.is_authenticated:
            user = request.user
        elif customer_data.get('email'):
            try:
                user = User.objects.get(email=customer_data['email'].lower())
                # Update user details if they exist
                if customer_data.get('name'):
                    name_parts = customer_data['name'].split(' ', 1)
                    user.first_name = name_parts[0]
                    if len(name_parts) > 1:
                        user.last_name = name_parts[1]
                if customer_data.get('phone'):
                    user.phone_number = customer_data['phone']
                user.save()
            except User.DoesNotExist:
                # Create new user if they don't exist
                username = customer_data['email'].split('@')[0]
                # Ensure username is unique
                if User.objects.filter(username=username).exists():
                    username = f"{username}{User.objects.count()}"
                
                user = User.objects.create_user(
                    username=username,
                    email=customer_data['email'].lower(),
                    first_name=customer_data.get('name', '').split(' ')[0],
                    last_name=' '.join(customer_data.get('name', '').split(' ')[1:]),
                    phone_number=customer_data.get('phone', '')
                )

        registrations = []
        errors = []
        
        with transaction.atomic():
            for ticket_data in tickets_data:
                ticket_id = ticket_data.get('ticket_id')
                event_id = ticket_data.get('event_id')
                quantity = ticket_data.get('quantity', 1)
                
                if not ticket_id or not quantity:
                    errors.append(f"Invalid ticket data: {ticket_data}")
                    continue

                try:
                    # Get the ticket with related event
                    ticket = EventTicket.objects.select_related('event').get(
                        id=ticket_id, 
                        is_active=True,
                        event_id=event_id
                    )
                except EventTicket.DoesNotExist:
                    error_msg = f'Ticket not found or inactive: {ticket_id} for event {event_id}'
                    logger.error(error_msg)
                    errors.append(error_msg)
                    continue

                # Check if ticket is available
                if not ticket.is_available():
                    error_msg = f'Ticket not available: {ticket_id}'
                    logger.error(error_msg)
                    errors.append(error_msg)
                    continue

                # Create registration for the ticket
                try:
                    registration = EventRegistration.objects.create(
                        event=ticket.event,
                        ticket=ticket,
                        user=user,
                        email=customer_data.get('email', ''),
                        first_name=customer_data.get('name', '').split(' ')[0] if customer_data.get('name') else '',
                        last_name=' '.join(customer_data.get('name', '').split(' ')[1:]) if customer_data.get('name') else '',
                        phone=customer_data.get('phone', ''),
                        status='confirmed' if is_paid else 'pending',
                        payment_reference=payment_reference,
                        is_paid=is_paid,
                        quantity=quantity
                    )
                    
                    registrations.append({
                        'id': registration.id,
                        'event': {
                            'id': ticket.event.id,
                            'title': ticket.event.title
                        },
                        'ticket': {
                            'id': ticket.id,
                            'name': ticket.name,
                            'price': float(ticket.price) if ticket.price is not None else 0.0
                        },
                        'quantity': quantity,
                        'status': registration.status,
                        'reference': registration.payment_reference
                    })
                    
                except Exception as e:
                    error_msg = f'Error creating registration for ticket {ticket_id}: {str(e)}'
                    logger.error(error_msg, exc_info=True)
                    errors.append(error_msg)
                    continue

        if not registrations and errors:
            return Response(
                {'error': 'Failed to register tickets', 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        response_data = {
            'success': True,
            'message': f'Successfully registered {len(registrations)} tickets',
            'registrations': registrations
        }
        
        if errors:
            response_data['warnings'] = errors

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f'Error in register_tickets: {str(e)}', exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class AvailableTicketsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing all available tickets across events.
    """
    serializer_class = EventTicketListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Return all available tickets for future events."""
        now = timezone.now()
        
        return EventTicket.objects.filter(
            is_active=True,
            event__has_tickets=True,
            event__date__gte=now.date(),  # Only future events
            sale_start__lte=now,  # Sale has started
            sale_end__gte=now,    # Sale hasn't ended
        ).select_related('event', 'ticket_type').order_by('event__date')
