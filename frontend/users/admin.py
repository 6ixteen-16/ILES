from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('ILES Profile', {'fields': ('role', 'phone', 'student_id', 'organization', 'department', 'bio')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('ILES Profile', {'fields': ('role', 'email', 'first_name', 'last_name')}),
    )
