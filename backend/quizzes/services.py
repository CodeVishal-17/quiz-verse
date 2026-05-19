from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Quiz, QuizRegistration


def register_student_for_quiz(student, quiz):
    """
    Validates rules and creates a pending QuizRegistration.
    """
    if not quiz.visible_to_students or quiz.is_archived:
        raise ValidationError("This quiz is not available.")
        
    if not quiz.is_registration_open or quiz.status != Quiz.Status.REGISTRATION_OPEN:
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
            
    registration = QuizRegistration.objects.create(
        student=student,
        quiz=quiz,
        payment_status=QuizRegistration.PaymentStatus.PENDING
    )
    
    if quiz.registration_fee == 0:
        registration = process_mock_payment(registration)
    
    # Future hook: trigger_notification('registration_pending', registration)
    
    return registration


def process_mock_payment(registration):
    """
    Validates payment state and strictly generates the Player ID inside a transaction.
    """
    if registration.payment_status == QuizRegistration.PaymentStatus.PAID:
        raise ValidationError("Payment has already been processed for this registration.")
        
    with transaction.atomic():
        # Lock the quiz rows to prevent race conditions during sequence generation
        # by counting current paid registrations and safely assigning the next.
        # A simple lock on the Quiz row helps serialize sequence generation.
        quiz = Quiz.objects.select_for_update().get(id=registration.quiz_id)
        
        # In a real system we'd verify the mock payment token/intent here.
        
        # Generate sequence number based on current max
        max_seq = QuizRegistration.objects.filter(
            quiz=quiz, 
            sequence_number__isnull=False
        ).aggregate(models.Max('sequence_number'))['sequence_number__max']
        
        next_seq = 1 if max_seq is None else max_seq + 1
        
        registration.payment_status = QuizRegistration.PaymentStatus.PAID
        registration.sequence_number = next_seq
        registration.player_id = f"PLAYER {next_seq:03d}"
        registration.save(update_fields=['payment_status', 'sequence_number', 'player_id', 'updated_at'])
        
        # Future hook: trigger_notification('payment_completed', registration)
        
    return registration
