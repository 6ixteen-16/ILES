from django.contrib import admin
from .models import EvaluationCriteria, Evaluation, CriteriaScore

@admin.register(EvaluationCriteria)
class CriteriaAdmin(admin.ModelAdmin):
    list_display = ['name', 'evaluator_type', 'weight', 'max_score', 'is_active']

@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ['student', 'placement', 'evaluator', 'total_score', 'grade', 'is_submitted']

admin.site.register(CriteriaScore)
