from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_verification import TicketVerificationView, TicketCheckInView
from .views_payment import CreatePaymentIntentView, WebhookHandlerView

router = DefaultRouter()
router.register(r'types', views.TicketTypeViewSet, basename='ticket-type')

urlpatterns = [
    path('', include(router.urls)),
    
    # Ticket purchase endpoints
    path('purchases/', views.TicketPurchaseListCreateView.as_view(), name='ticket-purchase-list'),
    path('purchases/<uuid:id>/', views.TicketPurchaseDetailView.as_view(), name='ticket-purchase-detail'),
    path('purchase/', views.TicketPurchaseView.as_view(), name='purchase-ticket'),
    
    # Payment endpoints
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('webhook/', WebhookHandlerView.as_view(), name='stripe-webhook'),
    
    # User tickets
    path('my-tickets/', views.UserTicketsList.as_view(), name='user-tickets-list'),
    path('my-tickets/<uuid:pk>/', views.UserTicketDetail.as_view(), name='user-ticket-detail'),
    
    # Verification endpoints
    path('verify/<uuid:verification_code>/', TicketVerificationView.as_view(), name='verify-ticket'),
    path('verify/', TicketVerificationView.as_view(), name='verify-ticket-post'),
    path('check-in/', TicketCheckInView.as_view(), name='check-in-ticket'),
    
    # Admin endpoints
    path('admin/tickets/', views.AdminTicketList.as_view(), name='admin-ticket-list'),
    path('admin/tickets/<uuid:pk>/', views.AdminTicketDetail.as_view(), name='admin-ticket-detail'),
]  

urlpatterns += router.urls
