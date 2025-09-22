from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that adds more context to error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If the exception is already handled by DRF, return the response
    if response is not None:
        return response
    
    # Log the error for debugging
    
    # Handle specific exceptions
    if isinstance(exc, ValidationError):
        return Response(
            {"detail": "Validation error", "errors": exc.messages},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Default error response
    return Response(
        {"detail": "A server error occurred. Please try again later."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
