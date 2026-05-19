from datetime import timedelta
from django.conf import settings
from django.db import models

from users.models import Branch, Program, School


class Quiz(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        UPCOMING = "upcoming", "Upcoming"
        REGISTRATION_OPEN = "registration_open", "Registration Open"
        REGISTRATION_CLOSED = "registration_closed", "Registration Closed"
        LIVE = "live", "Live"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    title = models.CharField(max_length=200)
    description = models.TextField()
    event_date = models.DateTimeField(blank=True, null=True)
    registration_open_date = models.DateTimeField(blank=True, null=True)
    registration_close_date = models.DateTimeField(blank=True, null=True)
    
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.DRAFT
    )
    visible_to_students = models.BooleanField(default=False)
    is_registration_open = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    max_participants = models.IntegerField(blank=True, null=True)
    registration_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Eligibility constraints
    allowed_schools = models.ManyToManyField(School, blank=True)
    allowed_programs = models.ManyToManyField(Program, blank=True)
    allowed_branches = models.ManyToManyField(Branch, blank=True)
    allowed_years = models.JSONField(default=list, blank=True)  # e.g., ["1", "2"]

    banner_image = models.ImageField(upload_to="quiz_banners/", blank=True, null=True)
    rules_instructions = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_quizzes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-event_date", "-created_at"]
        verbose_name_plural = "Quizzes"

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
        
    def save(self, *args, **kwargs):
        if self.event_date:
            auto_close = self.event_date - timedelta(hours=12)
            if not self.registration_close_date or self.registration_close_date > auto_close:
                self.registration_close_date = auto_close
        super().save(*args, **kwargs)


class QuizRegistration(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="registrations"
    )
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="registrations"
    )
    
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    
    sequence_number = models.IntegerField(blank=True, null=True)
    player_id = models.CharField(max_length=40, blank=True)
    
    registered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-registered_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "quiz"], name="unique_student_registration_per_quiz"
            ),
            models.UniqueConstraint(
                fields=["quiz", "sequence_number"], name="unique_sequence_per_quiz"
            )
        ]

    def __str__(self):
        return f"{self.student.full_name} -> {self.quiz.title}"
