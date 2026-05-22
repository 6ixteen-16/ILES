from django.urls import path
from . import views

urlpatterns = [
    path('', views.WeeklyLogListCreateView.as_view(), name='log_list'),
    path('<int:pk>/', views.WeeklyLogDetailView.as_view(), name='log_detail'),
    path('<int:pk>/transition/', views.transition_log_status, name='log_transition'),
]
