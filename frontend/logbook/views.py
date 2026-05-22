from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import WeeklyLog, LogReview, StatusHistory
from .serializers import WeeklyLogSerializer, LogTransitionSerializer


class WeeklyLogListCreateView(generics.ListCreateAPIView):
    serializer_class = WeeklyLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'placement', 'week_number']
    ordering_fields = ['week_number', 'created_at', 'submitted_at']

    def get_queryset(self):
        user = self.request.user
        qs = WeeklyLog.objects.select_related('student', 'placement').prefetch_related('reviews', 'status_history')
        if user.is_student:
            return qs.filter(student=user)
        elif user.is_workplace_supervisor:
            return qs.filter(placement__workplace_supervisor=user)
        elif user.is_academic_supervisor:
            return qs.filter(placement__academic_supervisor=user)
        elif user.is_admin_user or user.is_staff:
            return qs.all()
        return WeeklyLog.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        placement = serializer.validated_data['placement']
        if user.is_student and placement.student != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only create logs for your own placement.")
        serializer.save(student=user)


class WeeklyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WeeklyLogSerializer

    def get_queryset(self):
        user = self.request.user
        qs = WeeklyLog.objects.select_related('student', 'placement').prefetch_related('reviews', 'status_history')
        if user.is_student:
            return qs.filter(student=user)
        elif user.is_workplace_supervisor:
            return qs.filter(placement__workplace_supervisor=user)
        elif user.is_academic_supervisor:
            return qs.filter(placement__academic_supervisor=user)
        elif user.is_admin_user or user.is_staff:
            return qs.all()
        return WeeklyLog.objects.none()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.can_edit():
            return Response(
                {'detail': f'Logs in "{instance.status}" status cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transition_log_status(request, pk):
    """
    Handles all log status transitions with audit trail.
    Student: draft -> submitted
    Supervisors: submitted -> reviewed/rejected, reviewed -> approved/rejected
    Admin: any
    """
    try:
        log = WeeklyLog.objects.get(pk=pk)
    except WeeklyLog.DoesNotExist:
        return Response({'detail': 'Log not found.'}, status=404)

    user = request.user
    serializer = LogTransitionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    new_status = serializer.validated_data['status']
    note = serializer.validated_data.get('note', '')
    comments = serializer.validated_data.get('comments', '')

    # Permission checks
    if user.is_student:
        if log.student != user:
            return Response({'detail': 'Not your log.'}, status=403)
        if new_status != 'submitted':
            return Response({'detail': 'Students can only submit logs.'}, status=403)

    elif user.is_workplace_supervisor or user.is_academic_supervisor:
        if log.placement.workplace_supervisor != user and log.placement.academic_supervisor != user:
            return Response({'detail': 'You are not assigned to this placement.'}, status=403)
        if new_status not in ['reviewed', 'approved', 'rejected']:
            return Response({'detail': 'Supervisors can only review, approve, or reject.'}, status=403)

    elif not (user.is_admin_user or user.is_staff):
        return Response({'detail': 'Permission denied.'}, status=403)

    old_status = log.status

    try:
        log.transition_to(new_status)
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)

    # Record audit trail
    StatusHistory.objects.create(
        log=log,
        changed_by=user,
        from_status=old_status,
        to_status=new_status,
        note=note,
    )

    # Create review record for supervisor actions
    if comments and user.role in ['workplace_supervisor', 'academic_supervisor']:
        LogReview.objects.create(
            log=log,
            reviewer=user,
            reviewer_type=user.role,
            comments=comments,
            status='approved' if new_status in ['reviewed', 'approved'] else 'rejected',
        )

    return Response(WeeklyLogSerializer(log).data)
