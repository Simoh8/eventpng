from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from ..models import Event, EventRegistration
from ..ticket_models.models import EventTicket, TicketType
from ..serializers import (
    TicketTypeSerializer,
    EventTicketSerializer,
    EventWithTicketsSerializer
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
