from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    # Order endpoints
    path('orders/', views.OrderListView.as_view(), name='order-list'),
    path('orders/<uuid:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    
    # Checkout
    path('checkout/session/', views.CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
    
    # Download tokens
    path('download-tokens/', views.DownloadTokenListView.as_view(), name='download-token-list'),
    path('download/<uuid:token>/', views.DownloadPhotoView.as_view(), name='download-photo'),
]
