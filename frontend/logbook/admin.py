from django.contrib import admin
from .models import WeeklyLog, LogReview, StatusHistory

@admin.register(WeeklyLog)
class WeeklyLogAdmin(admin.ModelAdmin):
    list_display = ['student', 'placement', 'week_number', 'status', 'submitted_at']
    list_filter = ['status']

admin.site.register(LogReview)
admin.site.register(StatusHistory)
