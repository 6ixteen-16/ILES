from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/placements/', include('placements.urls')),
    path('api/logs/', include('logbook.urls')),
    path('api/evaluations/', include('evaluations.urls')),
    path('api/dashboard/', include('dashboard.urls')),
]
