from rest_framework import serializers
from users.serializers import UserMinimalSerializer
from .models import InternshipPlacement


class PlacementSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    workplace_supervisor_detail = UserMinimalSerializer(source='workplace_supervisor', read_only=True)
    academic_supervisor_detail = UserMinimalSerializer(source='academic_supervisor', read_only=True)
    created_by_detail = UserMinimalSerializer(source='created_by', read_only=True)
    duration_weeks = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = InternshipPlacement
        fields = [
            'id', 'student', 'student_detail',
            'workplace_supervisor', 'workplace_supervisor_detail',
            'academic_supervisor', 'academic_supervisor_detail',
            'organization', 'department', 'address',
            'start_date', 'end_date', 'duration_weeks',
            'status', 'status_display', 'description',
            'created_at', 'updated_at', 'created_by', 'created_by_detail',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
        extra_kwargs = {
            'student': {'required': False},
        }

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and start >= end:
            raise serializers.ValidationError({'end_date': 'End date must be after start date.'})
        return attrs


class PlacementStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipPlacement
        fields = ['status']
