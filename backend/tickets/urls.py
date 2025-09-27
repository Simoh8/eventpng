from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_verification import TicketVerificationView, TicketCheckInView

router = DefaultRouter()
router.register(r'types', views.TicketTypeViewSet, basename='ticket-type')

urlpatterns = [
    # Ticket type endpoints
    path('types/event/<uuid:event_id>/', views.TicketTypeList.as_view(), name='ticket-type-list'),
    
    # Ticket purchase endpoints
    path('purchase/', views.TicketPurchaseView.as_view(), name='ticket-purchase'),
    path('my-tickets/', views.UserTicketsList.as_view(), name='user-tickets'),
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
