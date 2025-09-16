from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.conf import settings
from .serializers import EmailSerializer, PasswordResetSerializer

User = get_user_model()

class PasswordResetRequestView(APIView):
    """
    Request a password reset email.
    """
    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                
                # Generate token and uid for password reset
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Build reset URL
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
                
                # Email subject and message
                subject = "Password Reset Request"
                message = render_to_string('emails/password_reset_email.html', {
                    'user': user,
                    'reset_url': reset_url,
                })
                
                # Send email
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    html_message=message,
                    fail_silently=False,
                )
                
                return Response(
                    {'detail': 'Password reset email has been sent.'},
                    status=status.HTTP_200_OK
                )
                
            except User.DoesNotExist:
                # Don't reveal that the user doesn't exist
                return Response(
                    {'detail': 'If this email exists in our system, you will receive a password reset link.'},
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    """
    Confirm password reset and set new password.
    """
    def post(self, request, uidb64, token):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Get user from uid
                uid = urlsafe_base64_decode(uidb64).decode()
                user = User.objects.get(pk=uid)
                
                # Check token
                if default_token_generator.check_token(user, token):
                    # Set new password
                    user.set_password(serializer.validated_data['new_password'])
                    user.save()
                    return Response(
                        {'detail': 'Password has been reset successfully.'},
                        status=status.HTTP_200_OK
                    )
                
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                pass
                
        return Response(
            {'detail': 'Invalid or expired reset link.'},
            status=status.HTTP_400_BAD_REQUEST
        )
