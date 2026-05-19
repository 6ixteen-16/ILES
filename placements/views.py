from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import InternshipPlacement
from .serializers import PlacementSerializer, PlacementStatusSerializer


class PlacementListCreateView(generics.ListCreateAPIView):
    serializer_class = PlacementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'student', 'workplace_supervisor', 'academic_supervisor']
    search_fields = ['organization', 'department', 'student__first_name', 'student__last_name']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user or user.is_staff:
            return InternshipPlacement.objects.select_related(
                'student', 'workplace_supervisor', 'academic_supervisor'
            ).all()
        elif user.is_student:
            return InternshipPlacement.objects.filter(student=user).select_related(
                'workplace_supervisor', 'academic_supervisor'
            )
        elif user.is_workplace_supervisor:
            return InternshipPlacement.objects.filter(workplace_supervisor=user).select_related(
                'student', 'academic_supervisor'
            )
        elif user.is_academic_supervisor:
            return InternshipPlacement.objects.filter(academic_supervisor=user).select_related(
                'student', 'workplace_supervisor'
            )
        return InternshipPlacement.objects.none()

    def perform_create(self, serializer):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError
        user = self.request.user
        # Students create their own placements
        if user.is_student:
            try:
                serializer.save(student=user, created_by=user)
            except DjangoValidationError as e:
                raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else {'detail': str(e)})
        else:
            try:
                serializer.save(created_by=user)
            except DjangoValidationError as e:
                raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else {'detail': str(e)})


class PlacementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlacementSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user or user.is_staff:
            return InternshipPlacement.objects.all()
        elif user.is_student:
            return InternshipPlacement.objects.filter(student=user)
        elif user.is_workplace_supervisor:
            return InternshipPlacement.objects.filter(workplace_supervisor=user)
        elif user.is_academic_supervisor:
            return InternshipPlacement.objects.filter(academic_supervisor=user)
        return InternshipPlacement.objects.none()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status not in ['draft']:
            return Response(
                {'detail': 'Only draft placements can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_placement_status(request, pk):
    user = request.user
    if not (user.is_admin_user or user.is_staff):
        return Response({'detail': 'Only admins can update placement status.'}, status=403)
    try:
        placement = InternshipPlacement.objects.get(pk=pk)
    except InternshipPlacement.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    new_status = request.data.get('status')
    valid_statuses = [s[0] for s in InternshipPlacement.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({'detail': f'Invalid status. Choose from {valid_statuses}'}, status=400)

    placement.status = new_status
    placement.save(update_fields=['status'])
    return Response(PlacementSerializer(placement).data)
