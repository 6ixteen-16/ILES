from django.urls import path
from . import views

urlpatterns = [
    path('', views.PlacementListCreateView.as_view(), name='placement_list'),
    path('<int:pk>/', views.PlacementDetailView.as_view(), name='placement_detail'),
    path('<int:pk>/status/', views.update_placement_status, name='placement_status'),
]
