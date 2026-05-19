from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student Intern'),
        ('workplace_supervisor', 'Workplace Supervisor'),
        ('academic_supervisor', 'Academic Supervisor'),
        ('admin', 'Internship Administrator'),
    ]

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=20, blank=True)
    student_id = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_student(self):
        return self.role == 'student'

    @property
    def is_workplace_supervisor(self):
        return self.role == 'workplace_supervisor'

    @property
    def is_academic_supervisor(self):
        return self.role == 'academic_supervisor'

    @property
    def is_admin_user(self):
        return self.role == 'admin'
