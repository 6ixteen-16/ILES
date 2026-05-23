import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.iles_backend.settings')
django.setup()

from users.serializers import AdminUserCreateSerializer

data = {
    "username": "testadmin",
    "email": "test@admin.com",
    "first_name": "Test",
    "last_name": "Admin",
    "role": "academic_supervisor",
    "department": "CS"
}

serializer = AdminUserCreateSerializer(data=data)
print("Is valid?", serializer.is_valid())
if not serializer.is_valid():
    print("Errors:", serializer.errors)
