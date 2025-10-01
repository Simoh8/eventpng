from django.urls import path
from . import views
from .views.payment_views import PaystackWebhookView, PaystackVerifyPaymentView
from .views.ticket_views import CreateTicketPaymentView

app_name = 'payments'

urlpatterns = [
    # Order endpoints
    path('orders/', views.OrderListView.as_view(), name='order-list'),
    path('orders/<uuid:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    
    # Checkout
    path('checkout/session/', views.CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('webhook/stripe/', views.stripe_webhook, name='stripe-webhook'),
    
    # Paystack endpoints
    path('paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('paystack/verify/<str:reference>/', PaystackVerifyPaymentView.as_view(), name='verify-payment'),
    path('tickets/paystack/create-payment/', CreateTicketPaymentView.as_view(), name='create-ticket-payment'),
    
    # Download tokens
    path('download-tokens/', views.DownloadTokenListView.as_view(), name='download-token-list'),
    path('download/<uuid:token>/', views.DownloadPhotoView.as_view(), name='download-photo'),
]
