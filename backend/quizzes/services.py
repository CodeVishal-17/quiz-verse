from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.utils import timezone

from .models import Quiz, QuizRegistration


def register_student_for_quiz(student, quiz):
    """
    Validates rules and creates a pending QuizRegistration.
    """
    if not quiz.visible_to_students or quiz.is_archived:
        raise ValidationError("This quiz is not available.")
        
    if not quiz.is_registration_open:
        raise ValidationError("Registration is not open for this quiz.")
        
    if quiz.max_participants is not None:
        current_count = QuizRegistration.objects.filter(quiz=quiz).count()
        if current_count >= quiz.max_participants:
            raise ValidationError("This quiz has reached its maximum capacity.")
            
    if QuizRegistration.objects.filter(student=student, quiz=quiz).exists():
        raise ValidationError("You are already registered for this quiz.")
        
    # Eligibility checks
    if getattr(student, 'student_profile', None):
        profile = student.student_profile
        
        if quiz.allowed_schools.exists() and not quiz.allowed_schools.filter(id=profile.school_id).exists():
            raise ValidationError("Your school is not eligible for this quiz.")
            
        if quiz.allowed_programs.exists() and not quiz.allowed_programs.filter(id=profile.program_id).exists():
            raise ValidationError("Your program is not eligible for this quiz.")
            
        if quiz.allowed_branches.exists() and not quiz.allowed_branches.filter(id=profile.branch_id).exists():
            raise ValidationError("Your branch is not eligible for this quiz.")
            
        if quiz.allowed_years and profile.year not in quiz.allowed_years:
            raise ValidationError("Your academic year is not eligible for this quiz.")
            
    with transaction.atomic():
        # Lock the quiz rows to prevent race conditions during sequence generation
        # by counting current paid registrations and safely assigning the next.
        quiz_lock = Quiz.objects.select_for_update().get(id=quiz.id)
        
        # Generate sequence number based on current max
        max_seq = QuizRegistration.objects.filter(
            quiz=quiz_lock, 
            sequence_number__isnull=False
        ).aggregate(models.Max('sequence_number'))['sequence_number__max']
        
        next_seq = 1 if max_seq is None else max_seq + 1
        
        registration = QuizRegistration.objects.create(
            student=student,
            quiz=quiz_lock,
            payment_status=QuizRegistration.PaymentStatus.PENDING,
            sequence_number=next_seq,
            player_id=f"PLAYER {next_seq:03d}"
        )
    
    if quiz.registration_fee == 0:
        registration = process_mock_payment(registration)
    
    # Future hook: trigger_notification('registration_pending', registration)
    
    return registration


def process_mock_payment(registration):
    """
    Validates payment state and marks the registration as PAID.
    """
    if registration.payment_status == QuizRegistration.PaymentStatus.PAID:
        raise ValidationError("Payment has already been processed for this registration.")
        
    registration.payment_status = QuizRegistration.PaymentStatus.PAID
    registration.save(update_fields=['payment_status', 'updated_at'])
        
    return registration
