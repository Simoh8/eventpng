import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import TicketPurchase
from .serializers_verification import (
    TicketVerificationSerializer,
    TicketCheckInSerializer,
    QRCodeVerificationSerializer
)

logger = logging.getLogger(__name__)

class TicketVerificationView(APIView):
    """
    API endpoint for verifying tickets by QR code or verification code.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, verification_code=None):
        """
        Verify a ticket by its verification code.
        """
        if not verification_code:
            return Response(
                {"error": "Verification code is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Try to find the ticket by verification code
            ticket = get_object_or_404(TicketPurchase, verification_code=verification_code)
            
            # Check if ticket is valid
            if ticket.status != 'confirmed':
                return Response(
                    {
                        "error": "Ticket is not valid",
                        "status": ticket.get_status_display().lower(),
                        "valid": False
                    },
                    status=status.HTTP_200_OK
                )
            
            # Check if ticket has been used
            if ticket.status == 'used':
                return Response(
                    {
                        "error": "Ticket has already been used",
                        "status": "used",
                        "valid": False,
                        "used_at": ticket.updated_at.isoformat()
                    },
                    status=status.HTTP_200_OK
                )
            
            # Ticket is valid, mark as used
            ticket.mark_as_used()
            
            # Serialize the ticket data
            serializer = TicketVerificationSerializer(ticket)
            
            return Response({
                "valid": True,
                "ticket": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error verifying ticket: {str(e)}")
            return Response(
                {"error": "An error occurred while verifying the ticket"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """
        Verify a ticket by scanning a QR code (for mobile apps).
        Expects JSON with a 'qr_data' field containing the QR code data.
        """
        qr_data = request.data.get('qr_data', '')
        
        if not qr_data:
            return Response(
                {"error": "QR code data is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract verification code from QR data
        # Expected format: "ticket:{verification_code}"
        try:
            _, verification_code = qr_data.split(':')
            verification_code = verification_code.strip()
        except ValueError:
            return Response(
                {"error": "Invalid QR code format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reuse the get method for verification
        return self.get(request, verification_code)


class TicketCheckInView(APIView):
    """
    API endpoint for checking in attendees at the event.
    Requires authentication (event staff only).
    """
    def post(self, request):
        """
        Check in an attendee by ticket ID or verification code.
        """
        ticket_id = request.data.get('ticket_id')
        verification_code = request.data.get('verification_code')
        
        if not (ticket_id or verification_code):
            return Response(
                {"error": "Either ticket_id or verification_code is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find the ticket by ID or verification code
            if ticket_id:
                ticket = get_object_or_404(TicketPurchase, id=ticket_id)
            else:
                ticket = get_object_or_404(TicketPurchase, verification_code=verification_code)
            
            # Check if ticket is valid
            if ticket.status != 'confirmed':
                return Response(
                    {
                        "error": f"Ticket is {ticket.get_status_display().lower()}",
                        "status": ticket.status,
                        "checked_in": False
                    },
                    status=status.HTTP_200_OK
                )
            
            # Mark ticket as used
            ticket.mark_as_used()
            
            # Serialize the ticket data
            serializer = TicketVerificationSerializer(ticket)
            
            return Response({
                "checked_in": True,
                "ticket": serializer.data,
                "message": f"Successfully checked in {ticket.user.get_full_name() or ticket.user.email}"
            })
            
        except Exception as e:
            logger.error(f"Error during check-in: {str(e)}")
            return Response(
                {"error": "An error occurred during check-in"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
