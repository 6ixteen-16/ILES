from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer, UserMinimalSerializer, AdminUserCreateSerializer

User = get_user_model()


from rest_framework.exceptions import AuthenticationFailed

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Explicit safeguard to guarantee inactive accounts cannot get tokens
        if not self.user.is_active:
            raise AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )
            
        user_data = UserSerializer(self.user).data
        data['user'] = user_data
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
    serializer_class = AdminUserCreateSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        is_staff = getattr(request.user, 'is_staff', False)
        is_admin_role = getattr(request.user, 'role', '') == 'admin'
        
        if not (is_staff or is_admin_role):
            return Response(
                {"detail": "Only administrators can perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user or user.is_staff:
            return User.objects.all()
        return User.objects.filter(is_active=True)


class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user or user.is_staff:
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
