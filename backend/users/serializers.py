from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
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
        
        # Workplace supervisors require admin approval
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
    password = serializers.CharField(write_only=True, required=False)
    
    # FIX: Make these profile fields optional so incomplete frontend forms don't crash validation
    student_id = serializers.CharField(required=False, allow_blank=True)
    organization = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'student_id', 'organization', 'department',
            'password'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.get('role', 'student')
        user = CustomUser(**validated_data)
        
        if password:
            user.set_password(password)
        else:
            user.set_password('iles12345') # Default fallback password
            
        user.is_active = True
        
        # If the administrator makes another admin account, automatically escalate staff bits
        if role == 'admin':
            user.is_staff = True
            user.is_superuser = True
            
        user.save()
        return user