from rest_framework import serializers
from users.serializers import UserMinimalSerializer
from .models import WeeklyLog, LogReview, StatusHistory, VALID_TRANSITIONS


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_detail = UserMinimalSerializer(source='changed_by', read_only=True)

    class Meta:
        model = StatusHistory
        fields = ['id', 'from_status', 'to_status', 'note', 'changed_by_detail', 'changed_at']


class LogReviewSerializer(serializers.ModelSerializer):
    reviewer_detail = UserMinimalSerializer(source='reviewer', read_only=True)

    class Meta:
        model = LogReview
        fields = ['id', 'log', 'reviewer', 'reviewer_detail', 'reviewer_type', 'comments', 'status', 'reviewed_at']
        read_only_fields = ['id', 'reviewer', 'reviewer_type', 'reviewed_at']


class WeeklyLogSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    reviews = LogReviewSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_edit = serializers.ReadOnlyField()
    allowed_transitions = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyLog
        fields = [
            'id', 'student', 'student_detail', 'placement',
            'week_number', 'activities', 'challenges', 'learnings',
            'objectives_next_week', 'status', 'status_display',
            'can_edit', 'allowed_transitions',
            'submitted_at', 'created_at', 'updated_at',
            'reviews', 'status_history',
        ]
        read_only_fields = ['id', 'student', 'status', 'submitted_at', 'created_at', 'updated_at']

    def get_allowed_transitions(self, obj):
        return VALID_TRANSITIONS.get(obj.status, [])


class LogTransitionSerializer(serializers.Serializer):
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    comments = serializers.CharField(required=False, allow_blank=True)
