from django.urls import path
from . import views

app_name = 'photographer_dashboard'

urlpatterns = [
    path('stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('activity/', views.DashboardActivityView.as_view(), name='dashboard-activity'),
]
