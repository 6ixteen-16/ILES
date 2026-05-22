from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import EvaluationCriteria, Evaluation, CriteriaScore
from .serializers import (
    EvaluationCriteriaSerializer, EvaluationSerializer,
    CriteriaScoreSerializer, ScoreSubmitSerializer
)


class CriteriaListView(generics.ListCreateAPIView):
    serializer_class = EvaluationCriteriaSerializer

    def get_queryset(self):
        qs = EvaluationCriteria.objects.all()
        evaluator_type = self.request.query_params.get('evaluator_type')
        if evaluator_type:
            qs = qs.filter(evaluator_type=evaluator_type)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return [IsAuthenticated()]


class EvaluationListCreateView(generics.ListCreateAPIView):
    serializer_class = EvaluationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['placement', 'student', 'is_submitted', 'evaluator_type']

    def get_queryset(self):
        user = self.request.user
        qs = Evaluation.objects.select_related('student', 'evaluator', 'placement').prefetch_related('criteria_scores__criteria')
        if user.is_student:
            return qs.filter(student=user)
        elif user.is_workplace_supervisor:
            return qs.filter(evaluator=user)
        elif user.is_academic_supervisor:
            return qs.filter(evaluator=user)
        elif user.is_admin_user or user.is_staff:
            return qs.all()
        return Evaluation.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_workplace_supervisor or user.is_academic_supervisor or user.is_admin_user or user.is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only supervisors can create evaluations.")
        placement = serializer.validated_data['placement']
        evaluator_type = 'workplace' if user.is_workplace_supervisor else 'academic'
        # Prevent duplicate evaluations
        if Evaluation.objects.filter(placement=placement, evaluator=user).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'You have already evaluated this student for this placement.'})
        # Auto-fill student from placement
        serializer.save(
            evaluator=user,
            evaluator_type=evaluator_type,
            student=placement.student,
        )


class EvaluationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EvaluationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user or user.is_staff:
            return Evaluation.objects.all()
        elif user.is_student:
            return Evaluation.objects.filter(student=user)
        return Evaluation.objects.filter(evaluator=user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_submitted:
            return Response({'detail': 'Submitted evaluations cannot be edited.'}, status=400)
        return super().update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_scores(request, pk):
    """
    Submit all criteria scores for an evaluation and compute final grade.
    Expects: { scores: [{criteria: id, score: float}, ...], comments: "..." }
    """
    try:
        evaluation = Evaluation.objects.get(pk=pk)
    except Evaluation.DoesNotExist:
        return Response({'detail': 'Evaluation not found.'}, status=404)

    user = request.user
    if evaluation.evaluator != user and not (user.is_admin_user or user.is_staff):
        return Response({'detail': 'You are not the evaluator for this evaluation.'}, status=403)
    if evaluation.is_submitted:
        return Response({'detail': 'This evaluation has already been submitted.'}, status=400)

    serializer = ScoreSubmitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    scores_data = serializer.validated_data['scores']
    comments = serializer.validated_data.get('comments', '')

    # Save/update each criteria score
    for item in scores_data:
        criteria_id = item.get('criteria')
        score_value = item.get('score')
        if criteria_id is None or score_value is None:
            return Response({'detail': 'Each score must have criteria and score fields.'}, status=400)
        try:
            criteria = EvaluationCriteria.objects.get(pk=criteria_id)
        except EvaluationCriteria.DoesNotExist:
            return Response({'detail': f'Criteria {criteria_id} not found.'}, status=400)

        CriteriaScore.objects.update_or_create(
            evaluation=evaluation,
            criteria=criteria,
            defaults={'score': score_value}
        )

    if comments:
        evaluation.comments = comments
        evaluation.save(update_fields=['comments'])

    # Submit and compute score
    try:
        evaluation.submit()
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)

    return Response(EvaluationSerializer(evaluation).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def placement_scores_summary(request, placement_id):
    """Returns aggregated scores for a placement (for dashboards)."""
    from placements.models import InternshipPlacement
    try:
        placement = InternshipPlacement.objects.get(pk=placement_id)
    except InternshipPlacement.DoesNotExist:
        return Response({'detail': 'Placement not found.'}, status=404)

    evaluations = Evaluation.objects.filter(placement=placement, is_submitted=True)
    data = {
        'placement_id': placement_id,
        'student': str(placement.student),
        'evaluations': EvaluationSerializer(evaluations, many=True).data,
        'total_evaluations': evaluations.count(),
        'average_score': None,
        'final_grade': None,
    }
    scores = [e.total_score for e in evaluations if e.total_score is not None]
    if scores:
        avg = sum(scores) / len(scores)
        data['average_score'] = round(avg, 2)
        data['final_grade'] = Evaluation._compute_grade(avg)
    return Response(data)
