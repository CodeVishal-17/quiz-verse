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

    # KBC Event State Fields
    event_password = models.CharField(max_length=64, blank=True, default="")
    
    class Stage(models.TextChoices):
        REGULAR = "regular", "Regular Preliminary Quiz"
        BATCH_SELECTION = "batch_selection", "Selecting Top 30 and Batches"
        FFF_BATCH_1 = "fff_batch_1", "Fastest Finger First - Batch 1"
        HOTSEAT_BATCH_1 = "hotseat_batch_1", "Hotseat - Batch 1"
        FFF_BATCH_2 = "fff_batch_2", "Fastest Finger First - Batch 2"
        HOTSEAT_BATCH_2 = "hotseat_batch_2", "Hotseat - Batch 2"
        FFF_BATCH_3 = "fff_batch_3", "Fastest Finger First - Batch 3"
        HOTSEAT_BATCH_3 = "hotseat_batch_3", "Hotseat - Batch 3"
        COMPLETED = "completed", "Event Completed"

    current_stage = models.CharField(
        max_length=40, choices=Stage.choices, default=Stage.REGULAR
    )
    
    top_30_selected = models.JSONField(default=list, blank=True)
    batch_1_players = models.JSONField(default=list, blank=True)
    batch_2_players = models.JSONField(default=list, blank=True)
    batch_3_players = models.JSONField(default=list, blank=True)
    
    hotseat_player_1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="hotseat_1"
    )
    hotseat_player_2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="hotseat_2"
    )
    hotseat_player_3 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="hotseat_3"
    )
    
    hotseat_score_1 = models.IntegerField(default=0)
    hotseat_score_2 = models.IntegerField(default=0)
    hotseat_score_3 = models.IntegerField(default=0)
    
    hotseat_status_1 = models.CharField(max_length=20, default="pending")
    hotseat_status_2 = models.CharField(max_length=20, default="pending")
    hotseat_status_3 = models.CharField(max_length=20, default="pending")

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

class Question(models.Model):
    class QuestionType(models.TextChoices):
        REGULAR = "regular", "Regular (Preliminary)"
        FFF_1 = "fff_1", "Fastest Finger First (Batch 1)"
        FFF_2 = "fff_2", "Fastest Finger First (Batch 2)"
        FFF_3 = "fff_3", "Fastest Finger First (Batch 3)"
        HOTSEAT_1 = "hotseat_1", "Hotseat (Batch 1)"
        HOTSEAT_2 = "hotseat_2", "Hotseat (Batch 2)"
        HOTSEAT_3 = "hotseat_3", "Hotseat (Batch 3)"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    order = models.IntegerField(default=0, help_text="Order in which question appears")
    marks = models.IntegerField(default=1)
    
    question_type = models.CharField(
        max_length=20, choices=QuestionType.choices, default=QuestionType.REGULAR
    )
    category = models.CharField(max_length=100, blank=True, default="General")
    trivia = models.TextField(blank=True, default="", help_text="Trivia/fun facts related to the question")

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.text[:30]}"

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.text} ({'Correct' if self.is_correct else 'Incorrect'})"

class QuizAttempt(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    score = models.IntegerField(default=0)
    current_question_index = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "quiz"], name="unique_attempt_per_student_quiz")
        ]

    def __str__(self):
        return f"{self.student.full_name} - {self.quiz.title} Attempt"

class StudentAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE, blank=True, null=True)
    answered_at = models.DateTimeField(auto_now_add=True)
    time_taken_seconds = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="unique_answer_per_attempt_question")
        ]

    def __str__(self):
        return f"Answer to {self.question.id} by {self.attempt.student.full_name}"

class Team(models.Model):
    name = models.CharField(max_length=100)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="teams")
    leader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="led_teams")
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="joined_teams", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["name", "quiz"], name="unique_team_name_per_quiz")
        ]

    def __str__(self):
        return f"{self.name} ({self.quiz.title})"


class FFFAnswer(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="fff_answers")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fff_answers")
    batch_number = models.IntegerField()
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE, null=True, blank=True)
    time_taken_seconds = models.FloatField(default=0.0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quiz", "student", "batch_number", "question"], name="unique_fff_answer")
        ]

    def __str__(self):
        return f"FFF Batch {self.batch_number} - {self.student.full_name} ({self.time_taken_seconds}s)"


class HotseatAttempt(models.Model):
    class Status(models.TextChoices):
        PLAYING = "playing", "Playing"
        WALKED_AWAY = "walked_away", "Walked Away"
        FAILED = "failed", "Failed"
        COMPLETED = "completed", "Completed"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="hotseat_attempts")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hotseat_attempts")
    batch_number = models.IntegerField()
    current_question_index = models.IntegerField(default=0)
    score = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLAYING)
    
    # Lifelines used flags
    lifeline_5050_used = models.BooleanField(default=False)
    lifeline_poll_used = models.BooleanField(default=False)
    lifeline_switch_used = models.BooleanField(default=False)
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quiz", "student", "batch_number"], name="unique_hotseat_attempt")
        ]

    def __str__(self):
        return f"Hotseat Batch {self.batch_number} - {self.student.full_name} ({self.score} pts)"
