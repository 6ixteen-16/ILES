from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from users.models import CustomUser
from placements.models import InternshipPlacement


class EvaluationCriteria(models.Model):
    EVALUATOR_TYPE = [
        ('workplace', 'Workplace Supervisor'),
        ('academic', 'Academic Supervisor'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    weight = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight as percentage (e.g. 40 = 40%)"
    )
    evaluator_type = models.CharField(max_length=20, choices=EVALUATOR_TYPE)
    max_score = models.FloatField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Evaluation Criteria'
        ordering = ['evaluator_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.weight}%) – {self.get_evaluator_type_display()}"


class Evaluation(models.Model):
    EVALUATOR_TYPE = [
        ('workplace', 'Workplace Supervisor'),
        ('academic', 'Academic Supervisor'),
    ]

    student = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='received_evaluations',
        limit_choices_to={'role': 'student'}
    )
    placement = models.ForeignKey(
        InternshipPlacement, on_delete=models.CASCADE,
        related_name='evaluations'
    )
    evaluator = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='given_evaluations'
    )
    evaluator_type = models.CharField(max_length=20, choices=EVALUATOR_TYPE)
    total_score = models.FloatField(null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['placement', 'evaluator']
        ordering = ['-created_at']

    def compute_and_save_score(self):
        scores = self.criteria_scores.select_related('criteria').all()
        if not scores.exists():
            return None

        weighted_sum = 0
        total_weight = 0
        for cs in scores:
            if cs.criteria.max_score > 0:
                normalized = cs.score / cs.criteria.max_score
                weighted_sum += normalized * cs.criteria.weight
                total_weight += cs.criteria.weight

        if total_weight > 0:
            self.total_score = round((weighted_sum / total_weight) * 100, 2)
        else:
            self.total_score = 0

        self.grade = self._compute_grade(self.total_score)
        self.save(update_fields=['total_score', 'grade', 'updated_at'])
        return self.total_score

    @staticmethod
    def _compute_grade(score):
        if score is None:
            return ''
        if score >= 80:
            return 'A'
        elif score >= 70:
            return 'B'
        elif score >= 60:
            return 'C'
        elif score >= 50:
            return 'D'
        return 'F'

    def submit(self):
        if self.is_submitted:
            raise ValueError("Evaluation already submitted.")
        self.compute_and_save_score()
        self.is_submitted = True
        self.submitted_at = timezone.now()
        self.save(update_fields=['is_submitted', 'submitted_at', 'updated_at'])

    def __str__(self):
        return f"Evaluation of {self.student} by {self.evaluator} ({self.grade or 'Pending'})"


class CriteriaScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='criteria_scores')
    criteria = models.ForeignKey(EvaluationCriteria, on_delete=models.CASCADE)
    score = models.FloatField(validators=[MinValueValidator(0)])

    class Meta:
        unique_together = ['evaluation', 'criteria']

    def clean(self):
        if self.score and self.criteria and self.score > self.criteria.max_score:
            raise ValidationError(
                {'score': f'Score {self.score} exceeds maximum {self.criteria.max_score}.'}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.criteria.name}: {self.score}/{self.criteria.max_score}"
