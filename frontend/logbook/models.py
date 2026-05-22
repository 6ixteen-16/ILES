from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from users.models import CustomUser
from placements.models import InternshipPlacement


VALID_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['reviewed', 'rejected'],
    'reviewed': ['approved', 'rejected'],
    'approved': [],
    'rejected': ['draft'],
}


class WeeklyLog(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    student = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='weekly_logs'
    )
    placement = models.ForeignKey(
        InternshipPlacement, on_delete=models.CASCADE,
        related_name='weekly_logs'
    )
    week_number = models.PositiveIntegerField()
    activities = models.TextField()
    challenges = models.TextField(blank=True)
    learnings = models.TextField(blank=True)
    objectives_next_week = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['placement', 'week_number']
        ordering = ['week_number']

    def clean(self):
        if self.placement_id and self.student_id:
            if self.placement.student_id != self.student_id:
                raise ValidationError("Log student must match placement student.")

    def can_edit(self):
        return self.status in ['draft', 'rejected']

    def transition_to(self, new_status):
        allowed = VALID_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from '{self.status}' to '{new_status}'. "
                f"Allowed: {allowed}"
            )
        self.status = new_status
        if new_status == 'submitted':
            self.submitted_at = timezone.now()
        self.save()

    def __str__(self):
        return f"Week {self.week_number} – {self.student} [{self.status}]"


class LogReview(models.Model):
    REVIEW_STATUS = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    log = models.ForeignKey(WeeklyLog, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='log_reviews')
    reviewer_type = models.CharField(max_length=30)
    comments = models.TextField()
    status = models.CharField(max_length=20, choices=REVIEW_STATUS)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']

    def __str__(self):
        return f"Review by {self.reviewer} on {self.log}"


class StatusHistory(models.Model):
    log = models.ForeignKey(WeeklyLog, on_delete=models.CASCADE, related_name='status_history')
    changed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']
