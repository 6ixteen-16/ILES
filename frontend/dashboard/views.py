from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg, Q
from django.contrib.auth import get_user_model

from placements.models import InternshipPlacement
from logbook.models import WeeklyLog
from evaluations.models import Evaluation

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    user = request.user

    if user.is_student:
        return student_dashboard(user)
    elif user.is_workplace_supervisor:
        return supervisor_dashboard(user, supervisor_type='workplace')
    elif user.is_academic_supervisor:
        return supervisor_dashboard(user, supervisor_type='academic')
    elif user.is_admin_user or user.is_staff:
        return admin_dashboard()
    return Response({'detail': 'Unknown role.'}, status=400)


def student_dashboard(user):
    placements = InternshipPlacement.objects.filter(student=user)
    active_placement = placements.filter(status='active').first()
    logs = WeeklyLog.objects.filter(student=user)
    evaluations = Evaluation.objects.filter(student=user, is_submitted=True)

    data = {
        'role': 'student',
        'stats': {
            'total_placements': placements.count(),
            'active_placement': active_placement.id if active_placement else None,
            'active_org': active_placement.organization if active_placement else None,
            'total_logs': logs.count(),
            'draft_logs': logs.filter(status='draft').count(),
            'submitted_logs': logs.filter(status='submitted').count(),
            'approved_logs': logs.filter(status='approved').count(),
            'rejected_logs': logs.filter(status='rejected').count(),
            'total_evaluations': evaluations.count(),
            'average_score': round(evaluations.aggregate(avg=Avg('total_score'))['avg'] or 0, 2),
        },
        'recent_logs': list(
            logs.order_by('-updated_at')[:5].values(
                'id', 'week_number', 'status', 'submitted_at', 'updated_at'
            )
        ),
    }
    return Response(data)


def supervisor_dashboard(user, supervisor_type):
    if supervisor_type == 'workplace':
        placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
        pending_logs = WeeklyLog.objects.filter(
            placement__workplace_supervisor=user,
            status='submitted'
        )
    else:
        placements = InternshipPlacement.objects.filter(academic_supervisor=user)
        pending_logs = WeeklyLog.objects.filter(
            placement__academic_supervisor=user,
            status__in=['submitted', 'reviewed']
        )

    evaluations = Evaluation.objects.filter(evaluator=user)

    data = {
        'role': f'{supervisor_type}_supervisor',
        'stats': {
            'total_placements': placements.count(),
            'active_placements': placements.filter(status='active').count(),
            'pending_reviews': pending_logs.count(),
            'total_evaluations': evaluations.count(),
            'submitted_evaluations': evaluations.filter(is_submitted=True).count(),
        },
        'pending_logs': list(
            pending_logs.order_by('-submitted_at')[:10].values(
                'id', 'week_number', 'status', 'submitted_at',
                'student__first_name', 'student__last_name'
            )
        ),
        'placements_breakdown': list(
            placements.values('status').annotate(count=Count('id'))
        ),
    }
    return Response(data)


def admin_dashboard():
    total_users = User.objects.filter(is_active=True)
    placements = InternshipPlacement.objects.all()
    logs = WeeklyLog.objects.all()
    evaluations = Evaluation.objects.filter(is_submitted=True)

    data = {
        'role': 'admin',
        'stats': {
            'total_students': total_users.filter(role='student').count(),
            'total_workplace_supervisors': total_users.filter(role='workplace_supervisor').count(),
            'total_academic_supervisors': total_users.filter(role='academic_supervisor').count(),
            'total_placements': placements.count(),
            'active_placements': placements.filter(status='active').count(),
            'draft_placements': placements.filter(status='draft').count(),
            'completed_placements': placements.filter(status='completed').count(),
            'total_logs': logs.count(),
            'pending_reviews': logs.filter(status='submitted').count(),
            'total_evaluations': evaluations.count(),
            'average_score': round(evaluations.aggregate(avg=Avg('total_score'))['avg'] or 0, 2),
        },
        'placement_status_breakdown': list(
            placements.values('status').annotate(count=Count('id'))
        ),
        'log_status_breakdown': list(
            logs.values('status').annotate(count=Count('id'))
        ),
        'recent_placements': list(
            placements.order_by('-created_at')[:5].values(
                'id', 'organization', 'status', 'start_date', 'end_date',
                'student__first_name', 'student__last_name'
            )
        ),
        'top_scores': list(
            evaluations.order_by('-total_score')[:5].values(
                'id', 'total_score', 'grade',
                'student__first_name', 'student__last_name',
                'placement__organization'
            )
        ),
    }
    return Response(data)
