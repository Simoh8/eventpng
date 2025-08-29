import stripe
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from .models import Order, OrderItem, Transaction, DownloadToken
from . import serializers
from gallery.models import Photo
from accounts.permissions import IsOwner

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class OrderListView(generics.ListCreateAPIView):
    """View for listing and creating orders."""
    serializer_class = serializers.OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'items__photo')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class OrderDetailView(generics.RetrieveAPIView):
    """View for retrieving order details."""
    serializer_class = serializers.OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'items__photo')

class CreateCheckoutSessionView(APIView):
    """View for creating a Stripe checkout session."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = serializers.CreateCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        photo_ids = serializer.validated_data['photo_ids']
        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']
        
        # Get the photos
        photos = Photo.objects.filter(id__in=photo_ids, is_public=True)
        
        if not photos.exists():
            return Response(
                {"detail": "No valid photos found."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create a new order
            order = Order.objects.create(
                user=request.user,
                billing_email=request.user.email,
                billing_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
                status=Order.STATUS_PENDING,
                subtotal=0,
                tax_amount=0,
                total=0,
                currency='usd'
            )
            
            # Create order items and calculate total
            total = 0
            line_items = []
            
            for photo in photos:
                price = photo.price or 0
                total += price
                
                OrderItem.objects.create(
                    order=order,
                    photo=photo,
                    price=price
                )
                
                # Add to Stripe line items
                line_items.append({
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': photo.title or f"Photo {photo.id}",
                            'description': photo.description or "",
                            'images': [photo.image.url] if photo.image else [],
                        },
                        'unit_amount': int(price * 100),  # Convert to cents
                    },
                    'quantity': 1,
                })
            
            if total <= 0:
                # If total is 0, mark as paid immediately
                order.status = Order.STATUS_PAID
                order.total = 0
                order.save()
                
                # Create download tokens for free photos
                for photo in photos:
                    DownloadToken.objects.create(
                        order=order,
                        photo=photo,
                        expires_at=timezone.now() + timedelta(days=7)
                    )
                
                return Response({
                    "order_id": order.id,
                    "status": "paid",
                    "message": "Free photos are available for download.",
                    "download_tokens": [
                        token.token for token in order.download_tokens.all()
                    ]
                })
            
            # Update order total
            tax_amount = total * 0.1  # Example: 10% tax
            order.subtotal = total
            order.tax_amount = tax_amount
            order.total = total + tax_amount
            
            # Create a Stripe checkout session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url,
                customer_email=request.user.email,
                client_reference_id=str(order.id),
                metadata={
                    'order_id': str(order.id),
                    'user_id': str(request.user.id)
                }
            )
            
            # Save the Stripe session ID to the order
            order.stripe_payment_intent_id = session.payment_intent
            order.save()
            
            return Response({
                'session_id': session.id,
                'public_key': settings.STRIPE_PUBLIC_KEY,
                'order_id': str(order.id)
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    """Handle Stripe webhook events."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return Response({"error": str(e)}, status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return Response({"error": str(e)}, status=400)
    
    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object
        
        # Get the order
        try:
            order = Order.objects.get(id=session.client_reference_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)
        
        # Update the order status
        order.status = Order.STATUS_PAID
        order.paid_at = timezone.now()
        order.save()
        
        # Create download tokens for the purchased photos
        for item in order.items.all():
            DownloadToken.objects.create(
                order=order,
                photo=item.photo,
                expires_at=timezone.now() + timedelta(days=7)
            )
    
    return Response({"status": "success"})

class DownloadTokenListView(generics.ListAPIView):
    """View for listing download tokens for the current user."""
    serializer_class = serializers.DownloadTokenSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DownloadToken.objects.filter(
            order__user=self.request.user,
            expires_at__gt=timezone.now(),
            is_used=False
        )

class DownloadPhotoView(APIView):
    """View for downloading a photo using a valid token."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token, format=None):
        try:
            download_token = DownloadToken.objects.get(
                token=token,
                expires_at__gt=timezone.now(),
                is_used=False
            )
        except DownloadToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired download token."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark the token as used
        download_token.is_used = True
        download_token.used_at = timezone.now()
        download_token.save()
        
        # In a production environment, you'd serve the file here
        # For now, we'll return the photo URL
        photo = download_token.photo
        serializer = serializers.PhotoSerializer(photo)
        
        return Response(serializer.data)
