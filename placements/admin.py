from django.contrib import admin
from .models import InternshipPlacement

@admin.register(InternshipPlacement)
class PlacementAdmin(admin.ModelAdmin):
    list_display = ['student', 'organization', 'start_date', 'end_date', 'status']
    list_filter = ['status']
    search_fields = ['student__first_name', 'student__last_name', 'organization']
