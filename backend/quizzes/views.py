from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets, parsers
from rest_framework.decorators import action
import csv
from io import StringIO
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.db import transaction
import openpyxl
from openpyxl.styles import Font, PatternFill

from quizzes.models import Quiz, QuizRegistration, Question, Choice, QuizAttempt, StudentAnswer, FFFAnswer, HotseatAttempt
from quizzes.serializers import QuizRegistrationSerializer, QuizSerializer, FFFAnswerSerializer, HotseatAttemptSerializer, QuestionSerializer, EnrolledStudentSerializer
from quizzes.services import process_mock_payment, register_student_for_quiz
from django.utils import timezone
import random

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

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Quiz Template"
        
        headers = ['Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option (A/B/C/D)', 'Marks', 'Question Type (regular/fff_1/fff_2/fff_3/hotseat_1/hotseat_2/hotseat_3)', 'Category (e.g. Science/Bollywood/Sports)', 'Trivia (Explanation/Fun Facts)']
        ws.append(headers)
        
        header_font = Font(bold=True)
        header_fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            
        sample_row = [
            "What is the capital of France?",
            "London",
            "Berlin",
            "Paris",
            "Madrid",
            "C",
            1,
            "regular",
            "General",
            "Paris is the most populous city of France and has been one of Europe's major centres of finance, diplomacy, commerce, fashion, science and arts since the 17th century."
        ]
        ws.append(sample_row)
        
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column].width = min(max_length + 2, 50)

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="quiz_template.xlsx"'
        wb.save(response)
        return response

    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def upload_questions(self, request, pk=None):
        quiz = self.get_object()
        if 'file' not in request.FILES:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        file = request.FILES['file']
        if not file.name.endswith('.xlsx'):
            return Response({"detail": "Please upload an Excel (.xlsx) file."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
            
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) <= 1:
                return Response({"detail": "No questions found in Excel file."}, status=status.HTTP_400_BAD_REQUEST)
                
            created_count = 0
            
            with transaction.atomic():
                quiz.questions.all().delete()
                
                for idx, row in enumerate(rows[1:], start=1):
                    if not row or not row[0]:
                        continue
                        
                    text = str(row[0]).strip()
                    opt_a = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                    opt_b = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                    opt_c = str(row[3]).strip() if len(row) > 3 and row[3] else ''
                    opt_d = str(row[4]).strip() if len(row) > 4 and row[4] else ''
                    correct_opt = str(row[5]).strip().upper() if len(row) > 5 and row[5] else 'A'
                    marks = int(row[6]) if len(row) > 6 and row[6] is not None else 1
                    q_type = str(row[7]).strip().lower() if len(row) > 7 and row[7] else 'regular'
                    category = str(row[8]).strip() if len(row) > 8 and row[8] else 'General'
                    trivia = str(row[9]).strip() if len(row) > 9 and row[9] is not None else ''
                    
                    if q_type not in Question.QuestionType.values:
                        q_type = 'regular'
                    
                    question = Question.objects.create(
                        quiz=quiz, text=text, order=idx, marks=marks,
                        question_type=q_type, category=category, trivia=trivia
                    )
                    
                    if opt_a: Choice.objects.create(question=question, text=opt_a, is_correct=(correct_opt == 'A'))
                    if opt_b: Choice.objects.create(question=question, text=opt_b, is_correct=(correct_opt == 'B'))
                    if opt_c: Choice.objects.create(question=question, text=opt_c, is_correct=(correct_opt == 'C'))
                    if opt_d: Choice.objects.create(question=question, text=opt_d, is_correct=(correct_opt == 'D'))
                    
                    created_count += 1
                    
            return Response({"detail": f"Successfully imported {created_count} questions."})
            
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        quiz = self.get_object()
        stage = request.data.get('stage')
        if not stage or stage not in Quiz.Stage.values:
            return Response({"detail": "Invalid stage provided."}, status=400)
        quiz.current_stage = stage
        quiz.save(update_fields=['current_stage'])
        return Response(QuizSerializer(quiz).data)

    @action(detail=True, methods=['post'])
    def set_batches(self, request, pk=None):
        quiz = self.get_object()
        batch_1 = request.data.get('batch_1', [])
        batch_2 = request.data.get('batch_2', [])
        batch_3 = request.data.get('batch_3', [])
        
        if not batch_1 or not batch_2 or not batch_3:
            attempts = QuizAttempt.objects.filter(quiz=quiz, completed_at__isnull=False).order_by('-score', 'completed_at')
            student_ids = [att.student_id for att in attempts]
            
            top_30 = student_ids[:30]
            
            batch_1 = top_30[0:10]
            batch_2 = top_30[10:20]
            batch_3 = top_30[20:30]
            
            quiz.top_30_selected = top_30
        else:
            quiz.top_30_selected = list(batch_1) + list(batch_2) + list(batch_3)

        quiz.batch_1_players = batch_1
        quiz.batch_2_players = batch_2
        quiz.batch_3_players = batch_3
        quiz.save(update_fields=['top_30_selected', 'batch_1_players', 'batch_2_players', 'batch_3_players'])
        return Response(QuizSerializer(quiz).data)

    @action(detail=True, methods=['get'])
    def fff_results(self, request, pk=None):
        quiz = self.get_object()
        stage = quiz.current_stage
        if stage == Quiz.Stage.FFF_BATCH_1 or stage == Quiz.Stage.HOTSEAT_BATCH_1:
            batch_num = 1
            q_type = Question.QuestionType.FFF_1
        elif stage == Quiz.Stage.FFF_BATCH_2 or stage == Quiz.Stage.HOTSEAT_BATCH_2:
            batch_num = 2
            q_type = Question.QuestionType.FFF_2
        elif stage == Quiz.Stage.FFF_BATCH_3 or stage == Quiz.Stage.HOTSEAT_BATCH_3:
            batch_num = 3
            q_type = Question.QuestionType.FFF_3
        else:
            return Response({"detail": "FFF is not active or completed for this quiz stage."}, status=400)
            
        fff_question = Question.objects.filter(quiz=quiz, question_type=q_type).first()
        if not fff_question:
            return Response({"detail": "FFF question not found for this batch."}, status=404)
            
        answers = FFFAnswer.objects.filter(question=fff_question, batch_number=batch_num).select_related('student')
        
        serialized = FFFAnswerSerializer(answers, many=True).data
        
        for ans_data, ans_obj in zip(serialized, answers):
            ans_data['is_correct'] = ans_obj.selected_choice.is_correct if ans_obj.selected_choice else False
            
        serialized.sort(key=lambda x: (not x['is_correct'], x['time_taken_seconds']))
        
        return Response({
            "question": QuestionSerializer(fff_question).data,
            "results": serialized
        })

    @action(detail=True, methods=['post'])
    def promote_hotseat(self, request, pk=None):
        quiz = self.get_object()
        stage = quiz.current_stage
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({"detail": "Student ID is required."}, status=400)
            
        student = get_object_or_404(User, id=student_id)
        
        if stage == Quiz.Stage.FFF_BATCH_1 or stage == Quiz.Stage.HOTSEAT_BATCH_1:
            quiz.hotseat_player_1 = student
            quiz.hotseat_status_1 = "playing"
            quiz.save(update_fields=['hotseat_player_1', 'hotseat_status_1'])
            HotseatAttempt.objects.get_or_create(quiz=quiz, student=student, batch_number=1)
        elif stage == Quiz.Stage.FFF_BATCH_2 or stage == Quiz.Stage.HOTSEAT_BATCH_2:
            quiz.hotseat_player_2 = student
            quiz.hotseat_status_2 = "playing"
            quiz.save(update_fields=['hotseat_player_2', 'hotseat_status_2'])
            HotseatAttempt.objects.get_or_create(quiz=quiz, student=student, batch_number=2)
        elif stage == Quiz.Stage.FFF_BATCH_3 or stage == Quiz.Stage.HOTSEAT_BATCH_3:
            quiz.hotseat_player_3 = student
            quiz.hotseat_status_3 = "playing"
            quiz.save(update_fields=['hotseat_player_3', 'hotseat_status_3'])
            HotseatAttempt.objects.get_or_create(quiz=quiz, student=student, batch_number=3)
        else:
            return Response({"detail": "Promotion is not allowed in this stage."}, status=400)
            
        return Response(QuizSerializer(quiz).data)

    @action(detail=True, methods=['get'])
    def prelim_scores(self, request, pk=None):
        quiz = self.get_object()
        attempts = QuizAttempt.objects.filter(quiz=quiz, completed_at__isnull=False).select_related('student').order_by('-score', 'completed_at')
        data = []
        for idx, att in enumerate(attempts, 1):
            reg = QuizRegistration.objects.filter(quiz=quiz, student=att.student).first()
            data.append({
                "rank": idx,
                "student_id": att.student.id,
                "student_name": att.student.full_name,
                "player_id": reg.player_id if reg else "",
                "score": att.score,
                "time_taken": (att.completed_at - att.started_at).total_seconds() if att.completed_at and att.started_at else None
            })
        return Response(data)

    @action(detail=True, methods=['get'])
    def enrolled_students(self, request, pk=None):
        quiz = self.get_object()
        registrations = quiz.registrations.select_related('student').all()
        serializer = EnrolledStudentSerializer(registrations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enroll_student_manual(self, request, pk=None):
        quiz = self.get_object()
        email = request.data.get('email', '').strip().lower()
        full_name = request.data.get('full_name', '').strip()
        college_id = request.data.get('college_id', '').strip()
        payment_status = request.data.get('payment_status', 'paid').strip().lower()

        if not email or not full_name or not college_id:
            return Response({"detail": "Email, full name, and college ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        if payment_status not in [QuizRegistration.PaymentStatus.PAID, QuizRegistration.PaymentStatus.PENDING]:
            payment_status = QuizRegistration.PaymentStatus.PAID

        try:
            with transaction.atomic():
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'full_name': full_name,
                        'college_id': college_id,
                        'role': User.Role.STUDENT
                    }
                )
                if created:
                    user.set_password("KBC123")
                    user.save()
                else:
                    if not user.college_id:
                        user.college_id = college_id
                        user.save()

                from users.models import School, Program, Branch, StudentProfile
                if not hasattr(user, 'student_profile'):
                    school = School.objects.first()
                    if not school:
                        school = School.objects.create(school_name="Default School", school_code="DEFAULT_SCH")
                    
                    program = Program.objects.filter(school=school).first()
                    if not program:
                        program = Program.objects.create(school=school, program_name="Default Program", program_code="DEFAULT_PROG")
                    
                    branch = Branch.objects.filter(program=program).first()
                    if not branch:
                        branch = Branch.objects.create(program=program, branch_name="Default Branch", branch_code="DEFAULT_BR")

                    StudentProfile.objects.create(
                        user=user,
                        school=school,
                        program=program,
                        branch=branch,
                        year=StudentProfile.Year.FIRST
                    )

                if QuizRegistration.objects.filter(student=user, quiz=quiz).exists():
                    reg = QuizRegistration.objects.get(student=user, quiz=quiz)
                    reg.payment_status = payment_status
                    reg.save()
                    return Response({
                        "detail": "Student is already registered for this quiz. Registration status updated.",
                        "registration": EnrolledStudentSerializer(reg).data
                    })

                max_seq = QuizRegistration.objects.filter(
                    quiz=quiz,
                    sequence_number__isnull=False
                ).aggregate(Max('sequence_number'))['sequence_number__max']
                next_seq = 1 if max_seq is None else max_seq + 1

                reg = QuizRegistration.objects.create(
                    student=user,
                    quiz=quiz,
                    payment_status=payment_status,
                    sequence_number=next_seq,
                    player_id=f"PLAYER {next_seq:03d}"
                )

            return Response({
                "detail": f"Successfully enrolled student {full_name}.",
                "registration": EnrolledStudentSerializer(reg).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def bulk_enroll_students(self, request, pk=None):
        quiz = self.get_object()
        if 'file' not in request.FILES:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        file = request.FILES['file']
        filename = file.name.lower()
        
        is_xlsx = filename.endswith('.xlsx')
        is_csv = filename.endswith('.csv')
        
        if not is_xlsx and not is_csv:
            return Response({"detail": "Please upload an Excel (.xlsx) or CSV (.csv) file."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            rows = []
            if is_xlsx:
                wb = openpyxl.load_workbook(file, data_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))
            elif is_csv:
                file_data = file.read().decode('utf-8')
                csv_data = csv.reader(StringIO(file_data))
                rows = list(csv_data)

            if len(rows) <= 1:
                return Response({"detail": "No student records found in the uploaded file."}, status=status.HTTP_400_BAD_REQUEST)
                
            enrolled_count = 0
            skipped_count = 0
            
            from users.models import School, Program, Branch, StudentProfile
            
            with transaction.atomic():
                for idx, row in enumerate(rows[1:], start=1):
                    if not row or not any(row):
                        continue
                        
                    full_name = str(row[0]).strip() if len(row) > 0 and row[0] is not None else ''
                    email = str(row[1]).strip().lower() if len(row) > 1 and row[1] is not None else ''
                    college_id = str(row[2]).strip() if len(row) > 2 and row[2] is not None else ''
                    pay_status = str(row[3]).strip().lower() if len(row) > 3 and row[3] is not None else 'paid'
                    
                    if not email or not full_name or not college_id:
                        skipped_count += 1
                        continue
                        
                    if pay_status not in [QuizRegistration.PaymentStatus.PAID, QuizRegistration.PaymentStatus.PENDING]:
                        pay_status = QuizRegistration.PaymentStatus.PAID

                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'full_name': full_name,
                            'college_id': college_id,
                            'role': User.Role.STUDENT
                        }
                    )
                    if created:
                        user.set_password("KBC123")
                        user.save()
                    else:
                        if not user.college_id:
                            user.college_id = college_id
                            user.save()
                            
                    if not hasattr(user, 'student_profile'):
                        school = School.objects.first()
                        if not school:
                            school = School.objects.create(school_name="Default School", school_code="DEFAULT_SCH")
                        
                        program = Program.objects.filter(school=school).first()
                        if not program:
                            program = Program.objects.create(school=school, program_name="Default Program", program_code="DEFAULT_PROG")
                        
                        branch = Branch.objects.filter(program=program).first()
                        if not branch:
                            branch = Branch.objects.create(program=program, branch_name="Default Branch", branch_code="DEFAULT_BR")

                        StudentProfile.objects.create(
                            user=user,
                            school=school,
                            program=program,
                            branch=branch,
                            year=StudentProfile.Year.FIRST
                        )
                        
                    if QuizRegistration.objects.filter(student=user, quiz=quiz).exists():
                        reg = QuizRegistration.objects.get(student=user, quiz=quiz)
                        reg.payment_status = pay_status
                        reg.save()
                        continue
                        
                    max_seq = QuizRegistration.objects.filter(
                        quiz=quiz,
                        sequence_number__isnull=False
                    ).aggregate(Max('sequence_number'))['sequence_number__max']
                    next_seq = 1 if max_seq is None else max_seq + 1

                    QuizRegistration.objects.create(
                        student=user,
                        quiz=quiz,
                        payment_status=pay_status,
                        sequence_number=next_seq,
                        player_id=f"PLAYER {next_seq:03d}"
                    )
                    enrolled_count += 1
                    
            return Response({
                "detail": f"Successfully enrolled {enrolled_count} students. Skipped {skipped_count} invalid records."
            })
            
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def download_enrollment_template(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Student Enrollment Template"
        
        headers = ['Full Name', 'Email', 'College ID', 'Payment Status (paid/pending)']
        ws.append(headers)
        
        header_font = Font(bold=True)
        header_fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            
        sample_row = [
            "John Doe",
            "johndoe@quizverse.edu",
            "C1029384",
            "paid"
        ]
        ws.append(sample_row)
        
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column].width = min(max_length + 2, 40)

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="student_enrollment_template.xlsx"'
        wb.save(response)
        return response


class QuizAttemptStartView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        reg = get_object_or_404(QuizRegistration, quiz=quiz, student=request.user)
        if reg.payment_status != 'paid':
            return Response({"detail": "Payment required."}, status=403)
            
        attempt, created = QuizAttempt.objects.get_or_create(student=request.user, quiz=quiz)
        return Response({"attempt_id": attempt.id, "current_index": attempt.current_question_index})


class QuizAttemptNextQuestionView(APIView):
    permission_classes = [IsStudentUser]
    
    def get(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        attempt = get_object_or_404(QuizAttempt, student=request.user, quiz=quiz)
        
        questions = list(quiz.questions.order_by('order', 'id'))
        if attempt.current_question_index >= len(questions):
            return Response({"completed": True})
            
        question = questions[attempt.current_question_index]
        choices = [{"id": c.id, "text": c.text} for c in question.choices.all()]
        
        return Response({
            "completed": False,
            "question": {
                "id": question.id,
                "text": question.text,
                "marks": question.marks,
                "order": question.order,
                "choices": choices,
                "total_questions": len(questions),
                "current_index": attempt.current_question_index
            }
        })


class QuizAttemptSubmitAnswerView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        attempt = get_object_or_404(QuizAttempt, student=request.user, quiz=quiz)
        
        questions = list(quiz.questions.order_by('order', 'id'))
        if attempt.current_question_index >= len(questions):
            return Response({"detail": "Quiz already completed."}, status=400)
            
        question = questions[attempt.current_question_index]
        choice_id = request.data.get('choice_id')
        time_taken = request.data.get('time_taken', 0)
        
        selected_choice = None
        if choice_id:
            selected_choice = Choice.objects.filter(question=question, id=choice_id).first()
            if selected_choice and selected_choice.is_correct:
                attempt.score += question.marks
                
        StudentAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_choice=selected_choice,
            time_taken_seconds=time_taken
        )
        
        attempt.current_question_index += 1
        attempt.save()
        
        is_completed = attempt.current_question_index >= len(questions)
        if is_completed:
            from django.utils import timezone
            attempt.completed_at = timezone.now()
            attempt.save()
            
        correct_choice = Choice.objects.filter(question=question, is_correct=True).first()
        correct_choice_data = None
        if correct_choice:
            correct_choice_data = {
                "id": correct_choice.id,
                "text": correct_choice.text
            }
            
        return Response({
            "correct": selected_choice.is_correct if selected_choice else False,
            "completed": is_completed,
            "correct_choice": correct_choice_data,
            "trivia": question.trivia
        })


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

from quizzes.models import Team
from quizzes.serializers import TeamSerializer
from django.db.models import Q

class StudentTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStudentUser]
    serializer_class = TeamSerializer
    
    def get_queryset(self):
        # Teams for quizzes the user is registered for
        return Team.objects.filter(
            Q(leader=self.request.user) | Q(members=self.request.user) | Q(quiz__registrations__student=self.request.user)
        ).distinct()
        
    def perform_create(self, serializer):
        quiz_id = self.request.data.get('quiz')
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        if not QuizRegistration.objects.filter(quiz=quiz, student=self.request.user).exists():
            raise ValidationError({"detail": "You must be registered for this quiz to create a team."})
        serializer.save(leader=self.request.user, quiz=quiz)
        
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        team = self.get_object()
        if not QuizRegistration.objects.filter(quiz=team.quiz, student=request.user).exists():
            return Response({"detail": "You must be registered for this quiz to join this team."}, status=400)
            
        team.members.add(request.user)
        return Response({"detail": "Successfully joined team!"})


# Student KBC Event views
class VerifyQuizAccessView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        player_id = request.data.get('player_id', '').strip()
        password = request.data.get('event_password', '').strip()
        
        reg = QuizRegistration.objects.filter(quiz=quiz, student=request.user).first()
        if not reg or reg.payment_status != 'paid':
            return Response({"detail": "You are not registered or paid for this quiz."}, status=403)
            
        if reg.player_id.lower() != player_id.lower():
            return Response({"detail": "Invalid Player ID."}, status=400)
            
        if quiz.event_password and quiz.event_password != password:
            return Response({"detail": "Invalid Event Password. Please ask the organizers."}, status=400)
            
        return Response({"success": True, "detail": "Access granted to the arena."})


class QuizLiveStateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        user = request.user
        
        role = "spectator"
        batch_number = None
        is_in_active_batch = False
        hotseat_attempt_data = None
        
        if user.role == 'student':
            user_id = user.id
            is_testing_quiz = "test" in quiz.title.lower()
            
            if user_id in quiz.batch_1_players:
                role = "batch_player"
                batch_number = 1
            elif user_id in quiz.batch_2_players:
                role = "batch_player"
                batch_number = 2
            elif user_id in quiz.batch_3_players:
                role = "batch_player"
                batch_number = 3
            elif is_testing_quiz:
                role = "batch_player"
                stage = quiz.current_stage
                if stage in [Quiz.Stage.FFF_BATCH_2, Quiz.Stage.HOTSEAT_BATCH_2]:
                    batch_number = 2
                elif stage in [Quiz.Stage.FFF_BATCH_3, Quiz.Stage.HOTSEAT_BATCH_3]:
                    batch_number = 3
                else:
                    batch_number = 1
                
            stage = quiz.current_stage
            if (stage == Quiz.Stage.FFF_BATCH_1 and batch_number == 1) or \
               (stage == Quiz.Stage.FFF_BATCH_2 and batch_number == 2) or \
               (stage == Quiz.Stage.FFF_BATCH_3 and batch_number == 3):
                is_in_active_batch = True
                
            if (stage == Quiz.Stage.HOTSEAT_BATCH_1 and quiz.hotseat_player_1 == user) or \
               (stage == Quiz.Stage.HOTSEAT_BATCH_2 and quiz.hotseat_player_2 == user) or \
               (stage == Quiz.Stage.HOTSEAT_BATCH_3 and quiz.hotseat_player_3 == user):
                role = "hotseat_player"
                
            active_hotseat_player = None
            active_batch = None
            if stage == Quiz.Stage.HOTSEAT_BATCH_1:
                active_hotseat_player = quiz.hotseat_player_1
                active_batch = 1
            elif stage == Quiz.Stage.HOTSEAT_BATCH_2:
                active_hotseat_player = quiz.hotseat_player_2
                active_batch = 2
            elif stage == Quiz.Stage.HOTSEAT_BATCH_3:
                active_hotseat_player = quiz.hotseat_player_3
                active_batch = 3
                
            if active_hotseat_player:
                attempt = HotseatAttempt.objects.filter(quiz=quiz, student=active_hotseat_player, batch_number=active_batch).first()
                if attempt:
                    hotseat_attempt_data = HotseatAttemptSerializer(attempt).data
            
            # Load FFF question if active
            fff_question_data = None
            fff_answered = False
            fff_q_type = None
            fff_batch = None
            if stage == Quiz.Stage.FFF_BATCH_1:
                fff_q_type = Question.QuestionType.FFF_1
                fff_batch = 1
            elif stage == Quiz.Stage.FFF_BATCH_2:
                fff_q_type = Question.QuestionType.FFF_2
                fff_batch = 2
            elif stage == Quiz.Stage.FFF_BATCH_3:
                fff_q_type = Question.QuestionType.FFF_3
                fff_batch = 3
                
            if fff_q_type:
                fff_q = Question.objects.filter(quiz=quiz, question_type=fff_q_type).first()
                if fff_q:
                    fff_question_data = {
                        "id": fff_q.id,
                        "text": fff_q.text,
                        "choices": [{"id": c.id, "text": c.text} for c in fff_q.choices.all()]
                    }
                    fff_answered = FFFAnswer.objects.filter(
                        quiz=quiz, student=user, batch_number=fff_batch, question=fff_q
                    ).exists()
                    
        live_participants = quiz.registrations.count()
        total_questions = quiz.questions.filter(question_type=Question.QuestionType.REGULAR).count()
        overall_total_questions = quiz.questions.count()
                    
        return Response({
            "quiz_id": quiz.id,
            "title": quiz.title,
            "current_stage": quiz.current_stage,
            "student_role": role,
            "batch_number": batch_number,
            "is_in_active_batch": is_in_active_batch,
            "hotseat_attempt": hotseat_attempt_data,
            "stage_display": quiz.get_current_stage_display(),
            "fff_question": fff_question_data,
            "fff_answered": fff_answered,
            "live_participants": live_participants,
            "total_questions": total_questions,
            "overall_total_questions": overall_total_questions
        })


class FFFSubmitView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        stage = quiz.current_stage
        
        if stage == Quiz.Stage.FFF_BATCH_1:
            batch_num = 1
            q_type = Question.QuestionType.FFF_1
            players = quiz.batch_1_players
        elif stage == Quiz.Stage.FFF_BATCH_2:
            batch_num = 2
            q_type = Question.QuestionType.FFF_2
            players = quiz.batch_2_players
        elif stage == Quiz.Stage.FFF_BATCH_3:
            batch_num = 3
            q_type = Question.QuestionType.FFF_3
            players = quiz.batch_3_players
        else:
            return Response({"detail": "Fastest Finger First is not active at this stage."}, status=400)
            
        is_testing_quiz = "test" in quiz.title.lower()
        if request.user.id not in players and not is_testing_quiz:
            return Response({"detail": "You are not in the active batch for this Fastest Finger First round."}, status=403)
            
        fff_question = Question.objects.filter(quiz=quiz, question_type=q_type).first()
        if not fff_question:
            return Response({"detail": "FFF question not found."}, status=404)
            
        if FFFAnswer.objects.filter(quiz=quiz, student=request.user, batch_number=batch_num, question=fff_question).exists():
            return Response({"detail": "You have already submitted your answer for this round."}, status=400)
            
        choice_id = request.data.get('choice_id')
        time_taken = float(request.data.get('time_taken', 0.0))
        
        selected_choice = None
        if choice_id:
            selected_choice = Choice.objects.filter(question=fff_question, id=choice_id).first()
            
        answer = FFFAnswer.objects.create(
            quiz=quiz,
            student=request.user,
            batch_number=batch_num,
            question=fff_question,
            selected_choice=selected_choice,
            time_taken_seconds=time_taken
        )
        
        return Response({
            "submitted": True,
            "correct": selected_choice.is_correct if selected_choice else False
        })


class HotseatQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        stage = quiz.current_stage
        
        if stage == Quiz.Stage.HOTSEAT_BATCH_1:
            hotseat_player = quiz.hotseat_player_1
            batch_num = 1
            q_type = Question.QuestionType.HOTSEAT_1
        elif stage == Quiz.Stage.HOTSEAT_BATCH_2:
            hotseat_player = quiz.hotseat_player_2
            batch_num = 2
            q_type = Question.QuestionType.HOTSEAT_2
        elif stage == Quiz.Stage.HOTSEAT_BATCH_3:
            hotseat_player = quiz.hotseat_player_3
            batch_num = 3
            q_type = Question.QuestionType.HOTSEAT_3
        else:
            return Response({"detail": "Hotseat is not active at this stage."}, status=400)
            
        if not hotseat_player:
            return Response({"detail": "No hotseat contestant has been promoted yet."}, status=404)
            
        attempt = get_object_or_404(HotseatAttempt, quiz=quiz, student=hotseat_player, batch_number=batch_num)
        
        if attempt.status != HotseatAttempt.Status.PLAYING:
            return Response({"completed": True, "status": attempt.status, "score": attempt.score})
            
        questions = list(Question.objects.filter(quiz=quiz, question_type=q_type).order_by('order', 'id'))
        if not questions:
            return Response({"detail": "No hotseat questions have been uploaded for this batch."}, status=404)
            
        if attempt.current_question_index >= len(questions):
            attempt.status = HotseatAttempt.Status.COMPLETED
            attempt.completed_at = timezone.now()
            attempt.save()
            return Response({"completed": True, "status": attempt.status, "score": attempt.score})
            
        question = questions[attempt.current_question_index]
        choices = list(question.choices.all())
        
        return Response({
            "completed": False,
            "current_index": attempt.current_question_index,
            "total_questions": len(questions),
            "score": attempt.score,
            "question": {
                "id": question.id,
                "text": question.text,
                "category": question.category,
                "order": question.order,
                "choices": [{"id": c.id, "text": c.text} for c in choices]
            }
        })


PRIZE_MONEY_LADDER = [
    1000,      # Q1
    2000,      # Q2
    3000,      # Q3
    5000,      # Q4
    10000,     # Q5 (Checkpoint 1)
    20000,     # Q6
    40000,     # Q7
    80000,     # Q8
    160000,    # Q9
    320000,    # Q10 (Checkpoint 2)
    640000,    # Q11
    1250000,   # Q12
    2500000,   # Q13
    5000000,   # Q14
    10000000   # Q15 (Checkpoint 3)
]

class HotseatSubmitView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        stage = quiz.current_stage
        
        if stage == Quiz.Stage.HOTSEAT_BATCH_1:
            hotseat_player = quiz.hotseat_player_1
            batch_num = 1
            q_type = Question.QuestionType.HOTSEAT_1
        elif stage == Quiz.Stage.HOTSEAT_BATCH_2:
            hotseat_player = quiz.hotseat_player_2
            batch_num = 2
            q_type = Question.QuestionType.HOTSEAT_2
        elif stage == Quiz.Stage.HOTSEAT_BATCH_3:
            hotseat_player = quiz.hotseat_player_3
            batch_num = 3
            q_type = Question.QuestionType.HOTSEAT_3
        else:
            return Response({"detail": "Hotseat is not active at this stage."}, status=400)
            
        if request.user != hotseat_player:
            return Response({"detail": "You are not the active hotseat contestant."}, status=403)
            
        attempt = get_object_or_404(HotseatAttempt, quiz=quiz, student=request.user, batch_number=batch_num)
        
        if attempt.status != HotseatAttempt.Status.PLAYING:
            return Response({"detail": "Hotseat attempt already completed."}, status=400)
            
        questions = list(Question.objects.filter(quiz=quiz, question_type=q_type).order_by('order', 'id'))
        if attempt.current_question_index >= len(questions):
            return Response({"detail": "All questions completed."}, status=400)
            
        question = questions[attempt.current_question_index]
        choice_id = request.data.get('choice_id')
        
        selected_choice = Choice.objects.filter(question=question, id=choice_id).first()
        is_correct = selected_choice.is_correct if selected_choice else False
        
        if is_correct:
            current_points = PRIZE_MONEY_LADDER[attempt.current_question_index]
            attempt.score = current_points
            attempt.current_question_index += 1
            
            if attempt.current_question_index >= len(questions):
                attempt.status = HotseatAttempt.Status.COMPLETED
                attempt.completed_at = timezone.now()
                self.save_quiz_hotseat_score(quiz, batch_num, attempt.score, "completed")
            else:
                self.save_quiz_hotseat_score(quiz, batch_num, attempt.score, "playing")
                
            attempt.save()
            return Response({
                "correct": True,
                "current_points": attempt.score,
                "next_index": attempt.current_question_index,
                "completed": attempt.status == HotseatAttempt.Status.COMPLETED
            })
        else:
            checkpoint_score = 0
            fail_index = attempt.current_question_index
            if fail_index >= 10:
                checkpoint_score = 320000
            elif fail_index >= 5:
                checkpoint_score = 10000
            else:
                checkpoint_score = 0
                
            attempt.score = checkpoint_score
            attempt.status = HotseatAttempt.Status.FAILED
            attempt.completed_at = timezone.now()
            attempt.save()
            
            self.save_quiz_hotseat_score(quiz, batch_num, attempt.score, "failed")
            
            return Response({
                "correct": False,
                "correct_choice_id": Choice.objects.filter(question=question, is_correct=True).values_list('id', flat=True).first(),
                "checkpoint_points": attempt.score,
                "completed": True
            })
            
    def save_quiz_hotseat_score(self, quiz, batch_num, score, status):
        if batch_num == 1:
            quiz.hotseat_score_1 = score
            quiz.hotseat_status_1 = status
            quiz.save(update_fields=['hotseat_score_1', 'hotseat_status_1'])
        elif batch_num == 2:
            quiz.hotseat_score_2 = score
            quiz.hotseat_status_2 = status
            quiz.save(update_fields=['hotseat_score_2', 'hotseat_status_2'])
        elif batch_num == 3:
            quiz.hotseat_score_3 = score
            quiz.hotseat_status_3 = status
            quiz.save(update_fields=['hotseat_score_3', 'hotseat_status_3'])


class HotseatLifelineView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        stage = quiz.current_stage
        
        if stage == Quiz.Stage.HOTSEAT_BATCH_1:
            hotseat_player = quiz.hotseat_player_1
            batch_num = 1
            q_type = Question.QuestionType.HOTSEAT_1
        elif stage == Quiz.Stage.HOTSEAT_BATCH_2:
            hotseat_player = quiz.hotseat_player_2
            batch_num = 2
            q_type = Question.QuestionType.HOTSEAT_2
        elif stage == Quiz.Stage.HOTSEAT_BATCH_3:
            hotseat_player = quiz.hotseat_player_3
            batch_num = 3
            q_type = Question.QuestionType.HOTSEAT_3
        else:
            return Response({"detail": "Hotseat is not active at this stage."}, status=400)
            
        if request.user != hotseat_player:
            return Response({"detail": "You are not the active hotseat contestant."}, status=403)
            
        attempt = get_object_or_404(HotseatAttempt, quiz=quiz, student=request.user, batch_number=batch_num)
        if attempt.status != HotseatAttempt.Status.PLAYING:
            return Response({"detail": "Hotseat attempt already completed."}, status=400)
            
        lifeline = request.data.get('lifeline')
        if not lifeline or lifeline not in ['5050', 'poll', 'switch']:
            return Response({"detail": "Invalid lifeline provided."}, status=400)
            
        questions = list(Question.objects.filter(quiz=quiz, question_type=q_type).order_by('order', 'id'))
        question = questions[attempt.current_question_index]
        choices = list(question.choices.all())
        
        if lifeline == '5050':
            if attempt.lifeline_5050_used:
                return Response({"detail": "50:50 lifeline already used."}, status=400)
                
            correct_choice = next(c for c in choices if c.is_correct)
            incorrect_choices = [c for c in choices if not c.is_correct]
            
            random.shuffle(incorrect_choices)
            eliminated = incorrect_choices[:2]
            
            attempt.lifeline_5050_used = True
            attempt.save()
            
            return Response({
                "lifeline": "5050",
                "eliminated_choice_ids": [c.id for c in eliminated]
            })
            
        elif lifeline == 'poll':
            if attempt.lifeline_poll_used:
                return Response({"detail": "Audience Poll lifeline already used."}, status=400)
                
            correct_choice = next(c for c in choices if c.is_correct)
            
            correct_votes = random.randint(55, 75)
            remaining_votes = 100 - correct_votes
            
            incorrect_choices = [c for c in choices if not c.is_correct]
            random.shuffle(incorrect_choices)
            
            poll_results = {}
            poll_results[correct_choice.id] = correct_votes
            
            if len(incorrect_choices) >= 3:
                v1 = random.randint(5, max(5, remaining_votes - 10))
                remaining_votes -= v1
                v2 = random.randint(2, max(2, remaining_votes - 5))
                remaining_votes -= v2
                v3 = remaining_votes
                
                poll_results[incorrect_choices[0].id] = v1
                poll_results[incorrect_choices[1].id] = v2
                poll_results[incorrect_choices[2].id] = v3
            else:
                for idx, inc in enumerate(incorrect_choices):
                    if idx == len(incorrect_choices) - 1:
                        poll_results[inc.id] = remaining_votes
                    else:
                        v = random.randint(5, max(5, remaining_votes // 2))
                        poll_results[inc.id] = v
                        remaining_votes -= v
                        
            attempt.lifeline_poll_used = True
            attempt.save()
            
            return Response({
                "lifeline": "poll",
                "votes": poll_results
            })
            
        elif lifeline == 'switch':
            if attempt.lifeline_switch_used:
                return Response({"detail": "Switch Question lifeline already used."}, status=400)
                
            category = request.data.get('category', 'General')
            
            replacement = Question.objects.filter(
                quiz=quiz,
                question_type=q_type,
                category__iexact=category
            ).exclude(id=question.id).first()
            
            if not replacement:
                replacement = Question.objects.filter(
                    quiz=quiz,
                    question_type=q_type
                ).exclude(id=question.id).first()
                
            if not replacement:
                return Response({"detail": "No replacement questions available."}, status=404)
                
            original_order = question.order
            question.order = replacement.order
            replacement.order = original_order
            
            question.save(update_fields=['order'])
            replacement.save(update_fields=['order'])
            
            attempt.lifeline_switch_used = True
            attempt.save()
            
            choices = list(replacement.choices.all())
            return Response({
                "lifeline": "switch",
                "question": {
                    "id": replacement.id,
                    "text": replacement.text,
                    "category": replacement.category,
                    "order": original_order,
                    "choices": [{"id": c.id, "text": c.text} for c in choices]
                }
            })


class HotseatWalkAwayView(APIView):
    permission_classes = [IsStudentUser]
    
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        stage = quiz.current_stage
        
        if stage == Quiz.Stage.HOTSEAT_BATCH_1:
            hotseat_player = quiz.hotseat_player_1
            batch_num = 1
        elif stage == Quiz.Stage.HOTSEAT_BATCH_2:
            hotseat_player = quiz.hotseat_player_2
            batch_num = 2
        elif stage == Quiz.Stage.HOTSEAT_BATCH_3:
            hotseat_player = quiz.hotseat_player_3
            batch_num = 3
        else:
            return Response({"detail": "Hotseat is not active at this stage."}, status=400)
            
        if request.user != hotseat_player:
            return Response({"detail": "You are not the active hotseat contestant."}, status=403)
            
        attempt = get_object_or_404(HotseatAttempt, quiz=quiz, student=request.user, batch_number=batch_num)
        
        if attempt.status != HotseatAttempt.Status.PLAYING:
            return Response({"detail": "Hotseat attempt already completed."}, status=400)
            
        attempt.status = HotseatAttempt.Status.WALKED_AWAY
        attempt.completed_at = timezone.now()
        attempt.save()
        
        if batch_num == 1:
            quiz.hotseat_score_1 = attempt.score
            quiz.hotseat_status_1 = "walked_away"
            quiz.save(update_fields=['hotseat_score_1', 'hotseat_status_1'])
        elif batch_num == 2:
            quiz.hotseat_score_2 = attempt.score
            quiz.hotseat_status_2 = "walked_away"
            quiz.save(update_fields=['hotseat_score_2', 'hotseat_status_2'])
        elif batch_num == 3:
            quiz.hotseat_score_3 = attempt.score
            quiz.hotseat_status_3 = "walked_away"
            quiz.save(update_fields=['hotseat_score_3', 'hotseat_status_3'])
            
        return Response({
            "walked_away": True,
            "final_points": attempt.score
        })
