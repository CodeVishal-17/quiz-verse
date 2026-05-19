from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Quiz, QuizRegistration
from .serializers import QuizRegistrationSerializer, QuizSerializer
from .services import process_mock_payment, register_student_for_quiz

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsStudentUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')


class AdminQuizViewSet(viewsets.ModelViewSet):
    """
    CRUD for admin to manage quizzes.
    Includes archived quizzes by default.
    """
    permission_classes = [IsAdminUser]
    serializer_class = QuizSerializer
    
    def get_queryset(self):
        return Quiz.objects.annotate(
            registered_count=Count('registrations')
        ).all()
        
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminStatsView(APIView):
    """
    Returns platform-wide statistics for the admin dashboard.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        total_students = User.objects.filter(role='student').count()
        total_quizzes = Quiz.objects.filter(is_archived=False).count()
        active_quizzes = Quiz.objects.filter(is_archived=False, visible_to_students=True).count()
        total_registrations = QuizRegistration.objects.count()
        
        return Response({
            "total_students": total_students,
            "total_quizzes": total_quizzes,
            "active_quizzes": active_quizzes,
            "total_registrations": total_registrations
        })


class PublishedQuizListView(APIView):
    """
    Lists all published, non-archived quizzes for students.
    """
    permission_classes = [IsStudentUser]
    
    def get(self, request):
        quizzes = Quiz.objects.annotate(
            registered_count=Count('registrations')
        ).filter(
            visible_to_students=True,
            is_archived=False
        )
        return Response(QuizSerializer(quizzes, many=True).data)


class QuizDetailView(APIView):
    """
    Detailed view of a single quiz, available to authenticated users.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        quiz = get_object_or_404(
            Quiz.objects.annotate(registered_count=Count('registrations')), 
            pk=pk
        )
        
        # Prevent students from viewing hidden/archived quizzes
        if request.user.role == 'student' and (not quiz.visible_to_students or quiz.is_archived):
            return Response({"detail": "Quiz not found or not available."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(QuizSerializer(quiz).data)


class StudentRegistrationView(APIView):
    """
    Handles student registration for a quiz.
    """
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        
        try:
            registration = register_student_for_quiz(request.user, quiz)
            return Response(
                QuizRegistrationSerializer(registration).data, 
                status=status.HTTP_201_CREATED
            )
        except DjangoValidationError as e:
            raise ValidationError({"detail": str(e.message) if hasattr(e, 'message') else str(e)})


class MockPaymentView(APIView):
    """
    Handles the simulated payment success for a pending registration.
    """
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        registration = get_object_or_404(
            QuizRegistration, 
            quiz_id=pk, 
            student=request.user
        )
        
        try:
            processed_registration = process_mock_payment(registration)
            return Response(QuizRegistrationSerializer(processed_registration).data)
        except DjangoValidationError as e:
            raise ValidationError({"detail": str(e.message) if hasattr(e, 'message') else str(e)})


class MyRegistrationsView(APIView):
    """
    Returns the authenticated student's registrations.
    """
    permission_classes = [IsStudentUser]
    
    def get(self, request):
        registrations = QuizRegistration.objects.select_related('quiz').filter(
            student=request.user
        )
        return Response(QuizRegistrationSerializer(registrations, many=True).data)
