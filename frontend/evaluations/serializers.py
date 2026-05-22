from rest_framework import serializers
from users.serializers import UserMinimalSerializer
from .models import EvaluationCriteria, Evaluation, CriteriaScore


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    evaluator_type_display = serializers.CharField(source='get_evaluator_type_display', read_only=True)

    class Meta:
        model = EvaluationCriteria
        fields = ['id', 'name', 'description', 'weight', 'evaluator_type', 'evaluator_type_display', 'max_score', 'is_active']


class CriteriaScoreSerializer(serializers.ModelSerializer):
    criteria_detail = EvaluationCriteriaSerializer(source='criteria', read_only=True)

    class Meta:
        model = CriteriaScore
        fields = ['id', 'evaluation', 'criteria', 'criteria_detail', 'score']
        read_only_fields = ['id']


class EvaluationSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    evaluator_detail = UserMinimalSerializer(source='evaluator', read_only=True)
    criteria_scores = CriteriaScoreSerializer(many=True, read_only=True)
    evaluator_type_display = serializers.CharField(source='get_evaluator_type_display', read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id', 'student', 'student_detail', 'placement',
            'evaluator', 'evaluator_detail', 'evaluator_type', 'evaluator_type_display',
            'total_score', 'grade', 'is_submitted', 'submitted_at',
            'comments', 'criteria_scores', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'evaluator', 'evaluator_type', 'student', 'total_score', 'grade', 'is_submitted', 'submitted_at', 'created_at', 'updated_at']


class ScoreSubmitSerializer(serializers.Serializer):
    """Used for submitting scores in bulk."""
    scores = serializers.ListField(
        child=serializers.DictField()
    )
    comments = serializers.CharField(required=False, allow_blank=True)
