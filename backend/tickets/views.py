from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import TicketPurchase, TicketType
from .serializers import (
    TicketPurchaseSerializer, 
    CreateTicketPurchaseSerializer,
    TicketTypeSerializer,
    UserTicketSerializer
)

class TicketPurchaseListCreateView(generics.ListCreateAPIView):
    """
    API endpoint that allows users to list their ticket purchases or create new ones.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateTicketPurchaseSerializer
        return TicketPurchaseSerializer
    
    def get_queryset(self):
        return TicketPurchase.objects.filter(user=self.request.user).select_related('ticket', 'ticket__event')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TicketPurchaseDetailView(generics.RetrieveAPIView):
    """
    API endpoint to retrieve a specific ticket purchase.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TicketPurchaseSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        return TicketPurchase.objects.filter(user=self.request.user).select_related('ticket', 'ticket__event')


class EventTicketsView(generics.ListAPIView):
    """
    API endpoint to list available tickets for an event.
    """
    permission_classes = [permissions.AllowAny]  # Allow anyone to view available tickets
    serializer_class = TicketPurchaseSerializer
    
    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        return TicketPurchase.objects.filter(
            ticket__event_id=event_id,
            ticket__is_active=True
        ).select_related('ticket', 'ticket__event')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(user=request.user)
        return Response(
            TicketSerializer(ticket).data,
            status=status.HTTP_201_CREATED
        )

class TicketDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TicketPurchaseSerializer
    
    def get_queryset(self):
        return TicketPurchase.objects.filter(user=self.request.user)

class TicketTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing ticket types (admin only).
    """
    queryset = TicketType.objects.all()
    serializer_class = TicketTypeSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset


class TicketTypeList(generics.ListAPIView):
    """
    API endpoint to list available ticket types for an event.
    """
    serializer_class = TicketTypeSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        return TicketType.objects.filter(
            event_id=event_id,
            is_active=True,
            quantity_available__gt=0
        ).prefetch_related('event')


class TicketPurchaseView(generics.CreateAPIView):
    """
    API endpoint for purchasing tickets.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreateTicketPurchaseSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            ticket_type = TicketType.objects.get(
                id=serializer.validated_data['ticket_type_id'],
                is_active=True
            )
            
            # Check ticket availability
            if ticket_type.quantity_available < serializer.validated_data['quantity']:
                return Response(
                    {'detail': 'Not enough tickets available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create ticket purchase
            purchase = TicketPurchase.objects.create(
                user=request.user,
                ticket_type=ticket_type,
                quantity=serializer.validated_data['quantity'],
                total_price=ticket_type.price * serializer.validated_data['quantity']
            )
            
            # Update ticket type quantity
            ticket_type.quantity_available -= purchase.quantity
            ticket_type.save(update_fields=['quantity_available'])
            
            # TODO: Send confirmation email
            
            return Response(
                TicketPurchaseSerializer(purchase).data,
                status=status.HTTP_201_CREATED
            )
            
        except TicketType.DoesNotExist:
            return Response(
                {'detail': 'Ticket type not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserTicketsList(generics.ListAPIView):
    """
    API endpoint to list all tickets purchased by the current user.
    """
    serializer_class = UserTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TicketPurchase.objects.filter(
            user=self.request.user
        ).select_related('ticket_type', 'ticket_type__event')


class UserTicketDetail(generics.RetrieveAPIView):
    """
    API endpoint to view details of a specific ticket purchase.
    """
    serializer_class = UserTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TicketPurchase.objects.filter(user=self.request.user)


# Admin views
class AdminTicketList(generics.ListAPIView):
    """
    Admin endpoint to list all ticket purchases.
    """
    serializer_class = TicketPurchaseSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = TicketPurchase.objects.all().select_related('user', 'ticket_type', 'ticket_type__event')


class AdminTicketDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin endpoint to view, update, or delete a ticket purchase.
    """
    serializer_class = TicketPurchaseSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = TicketPurchase.objects.all()
    
    def perform_destroy(self, instance):
        # Restore ticket quantity when a purchase is deleted
        instance.ticket_type.quantity_available += instance.quantity
        instance.ticket_type.save(update_fields=['quantity_available'])
        instance.delete()
