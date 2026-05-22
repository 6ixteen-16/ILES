from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer, RegisterSerializer, ChangePasswordSerializer,
    UserMinimalSerializer, AdminUserCreateSerializer
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Explicit safeguard: inactive accounts cannot get tokens
        if not self.user.is_active:
            raise AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )

        data['user'] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class AdminCreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # FIX: use is_staff OR role == 'admin' — both conditions individually
        # grant access, not just the combination.
        if not (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
            return Response(
                {"detail": "Only administrators can perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    # BUG 1 FIX: was missing permission_classes entirely.
    # Without this, AnonymousUser reaches get_queryset() and crashes on
    # user.is_admin_user (AttributeError) → 500, which breaks the admin UI.
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'is_admin_user', False):
            return User.objects.all()
        return User.objects.filter(is_active=True)


class UserDetailView(generics.RetrieveUpdateAPIView):
    # BUG 2 FIX: same issue as UserListView — was missing permission_classes.
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'is_admin_user', False):
            return User.objects.all()
        return User.objects.filter(id=user.id)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisors_list(request):
    """Returns workplace and academic supervisors for dropdowns."""
    role = request.query_params.get('role')
    qs = User.objects.filter(is_active=True)
    if role:
        qs = qs.filter(role=role)
    else:
        qs = qs.filter(role__in=['workplace_supervisor', 'academic_supervisor'])
    return Response(UserMinimalSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_list(request):
    students = User.objects.filter(role='student', is_active=True)
    return Response(UserMinimalSerializer(students, many=True).data)
