from django.db import models
from django.core.exceptions import ValidationError
from users.models import CustomUser


class InternshipPlacement(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    student = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='placements',
        limit_choices_to={'role': 'student'}
    )
    workplace_supervisor = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_placements',
        limit_choices_to={'role': 'workplace_supervisor'}
    )
    academic_supervisor = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='academic_placements',
        limit_choices_to={'role': 'academic_supervisor'}
    )
    organization = models.CharField(max_length=255)
    department = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True,
        related_name='created_placements'
    )

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        errors = {}
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                errors['end_date'] = "End date must be after start date."
            else:
                # Check overlapping placements for same student
                overlapping = InternshipPlacement.objects.filter(
                    student=self.student,
                    status__in=['draft', 'active'],
                    start_date__lt=self.end_date,
                    end_date__gt=self.start_date,
                ).exclude(pk=self.pk)
                if overlapping.exists():
                    errors['start_date'] = "This student already has an overlapping placement during this period."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} @ {self.organization} ({self.status})"

    @property
    def duration_weeks(self):
        if self.start_date and self.end_date:
            return max(1, (self.end_date - self.start_date).days // 7)
        return 0
