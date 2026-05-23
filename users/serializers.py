from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'student_id', 'organization', 'department', 'bio',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'full_name', 'role', 'email']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm Password')

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password2',
            'role', 'phone', 'student_id', 'organization', 'department',
        ]

    def validate(self, attrs):
        if attrs.get('role') in ['academic_supervisor', 'admin']:
            raise serializers.ValidationError({'role': "Registration for this role is not allowed."})
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)

        # Workplace supervisors require admin approval before activation
        if user.role == 'workplace_supervisor':
            user.is_active = False

        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class AdminUserCreateSerializer(serializers.ModelSerializer):
    # BUG 3 FIX: added validate_password validator (was missing, unlike RegisterSerializer).
    # BUG 4 FIX: password is now required=True so admins must always set an explicit
    #            password. The old hardcoded 'iles12345' default was a security risk —
    #            every admin-created account without a password shared the same
    #            known credential.
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'student_id', 'organization', 'department',
            'is_active', 'password',
        ]
        # BUG 5 FIX (partial): expose is_active so admin can create inactive accounts
        # if needed (e.g. prepare an account before the user's start date).
        extra_kwargs = {
            'is_active': {'default': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')

        # BUG 5 FIX: use create_user() manager instead of CustomUser(**validated_data).
        # AbstractUser.objects.create_user() properly calls normalize_username() and
        # normalize_email(), preventing duplicate accounts due to casing differences
        # (e.g. "Alice" vs "alice"). Direct CustomUser(**data).save() bypasses this.
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data,
        )
        return user
