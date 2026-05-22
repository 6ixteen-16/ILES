from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change_password'),
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/create/', views.AdminCreateUserView.as_view(), name='admin_create_user'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('supervisors/', views.supervisors_list, name='supervisors_list'),
    path('students/', views.students_list, name='students_list'),
]
