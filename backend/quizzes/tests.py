from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from quizzes.models import Quiz, QuizRegistration, Question, Choice
from users.models import School, Program, Branch, StudentProfile
import io
import openpyxl

User = get_user_model()

class QuizEnrollmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create school program branch
        self.school = School.objects.create(school_name="Engineering School", school_code="SOET")
        self.program = Program.objects.create(school=self.school, program_name="Computer Science", program_code="CSE_PROG")
        self.branch = Branch.objects.create(program=self.program, branch_name="CSE Branch", branch_code="CSE")
        
        # Create admin user
        self.admin_user = User.objects.create_superuser(
            email="admin@quizverse.edu",
            password="adminpassword123",
            full_name="System Admin",
            college_id="ADMIN001"
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.admin_user)
        
        # Create active quiz
        self.quiz = Quiz.objects.create(
            title="KBC Arena Live Testing Quiz",
            description="Testing live event",
            status=Quiz.Status.REGISTRATION_OPEN,
            event_password="KBC123",
            created_by=self.admin_user
        )

    def test_manual_enroll_student(self):
        url = f"/api/quizzes/admin/{self.quiz.id}/enroll_student_manual/"
        payload = {
            "email": "contestant@quizverse.edu",
            "full_name": "Contestant One",
            "college_id": "ST001",
            "payment_status": "paid"
        }
        
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("Successfully enrolled", response.data["detail"])
        
        # Verify database creation
        self.assertTrue(User.objects.filter(email="contestant@quizverse.edu").exists())
        student = User.objects.get(email="contestant@quizverse.edu")
        self.assertEqual(student.full_name, "Contestant One")
        self.assertEqual(student.college_id, "ST001")
        
        # Verify student profile created automatically
        self.assertTrue(hasattr(student, "student_profile"))
        
        # Verify registration created
        self.assertTrue(QuizRegistration.objects.filter(student=student, quiz=self.quiz).exists())
        reg = QuizRegistration.objects.get(student=student, quiz=self.quiz)
        self.assertEqual(reg.payment_status, "paid")
        self.assertEqual(reg.player_id, "PLAYER 001")

    def test_manual_enroll_duplicate_returns_ok_with_updated_status(self):
        # First enroll
        url = f"/api/quizzes/admin/{self.quiz.id}/enroll_student_manual/"
        payload = {
            "email": "contestant@quizverse.edu",
            "full_name": "Contestant One",
            "college_id": "ST001",
            "payment_status": "pending"
        }
        self.client.post(url, payload, format="json")
        
        # Re-enroll with status paid
        payload["payment_status"] = "paid"
        response = self.client.post(url, payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("already registered", response.data["detail"])
        
        # Check DB payment_status updated
        reg = QuizRegistration.objects.get(student__email="contestant@quizverse.edu", quiz=self.quiz)
        self.assertEqual(reg.payment_status, "paid")

    def test_download_enrollment_template(self):
        url = "/api/quizzes/admin/download_enrollment_template/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
        # Verify xlsx contents
        wb = openpyxl.load_workbook(io.BytesIO(response.content))
        ws = wb.active
        self.assertEqual(ws.title, "Student Enrollment Template")
        headers = [cell.value for cell in ws[1]]
        self.assertEqual(headers, ['Full Name', 'Email', 'College ID', 'Payment Status (paid/pending)'])

    def test_bulk_enroll_students_csv(self):
        url = f"/api/quizzes/admin/{self.quiz.id}/bulk_enroll_students/"
        csv_content = (
            "Full Name,Email,College ID,Payment Status (paid/pending)\n"
            "Bulk Student 1,bulk1@quizverse.edu,ST_BULK1,paid\n"
            "Bulk Student 2,bulk2@quizverse.edu,ST_BULK2,pending\n"
        )
        csv_file = io.BytesIO(csv_content.encode("utf-8"))
        csv_file.name = "students.csv"
        
        response = self.client.post(url, {"file": csv_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Successfully enrolled 2 students", response.data["detail"])
        
        # Verify databases
        self.assertEqual(User.objects.filter(email__contains="bulk").count(), 2)
        u1 = User.objects.get(email="bulk1@quizverse.edu")
        u2 = User.objects.get(email="bulk2@quizverse.edu")
        self.assertEqual(u1.college_id, "ST_BULK1")
        self.assertEqual(u2.college_id, "ST_BULK2")
        
        reg1 = QuizRegistration.objects.get(student=u1, quiz=self.quiz)
        reg2 = QuizRegistration.objects.get(student=u2, quiz=self.quiz)
        self.assertEqual(reg1.payment_status, "paid")
        self.assertEqual(reg2.payment_status, "pending")
