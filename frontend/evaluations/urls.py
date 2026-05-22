from django.urls import path
from . import views

urlpatterns = [
    path('criteria/', views.CriteriaListView.as_view(), name='criteria_list'),
    path('', views.EvaluationListCreateView.as_view(), name='evaluation_list'),
    path('<int:pk>/', views.EvaluationDetailView.as_view(), name='evaluation_detail'),
    path('<int:pk>/submit/', views.submit_scores, name='evaluation_submit'),
    path('placement/<int:placement_id>/summary/', views.placement_scores_summary, name='placement_summary'),
]
