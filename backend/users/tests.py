from django.test import TestCase
from rest_framework.test import APIClient

from .models import School, Program, Branch, User, StudentProfile


class StudentAuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(school_name="School of Engineering", school_code="SOET")
        self.program = Program.objects.create(school=self.school, program_name="Computer Science", program_code="CSE_PROG")
        self.branch = Branch.objects.create(program=self.program, branch_name="Computer Science Engineering", branch_code="CSE")

    def test_student_can_register_and_login(self):
        payload = {
            "full_name": "Aria Sharma",
            "college_id": "QV123",
            "email": "aria@example.edu",
            "school": self.school.id,
            "program": self.program.id,
            "branch": self.branch.id,
            "year": "3",
            "password": "strongpass123",
            "confirm_password": "strongpass123",
        }

        register_response = self.client.post("/api/users/register/", payload, format="json")

        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertNotEqual(User.objects.get().password, payload["password"])
        self.assertIn("token", register_response.data)

        login_response = self.client.post(
            "/api/users/login/",
            {"identifier": payload["college_id"], "password": payload["password"]},
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["student"]["email"], payload["email"])
        self.assertIn("token", login_response.data)

    def test_duplicate_college_id_is_rejected(self):
        user = User(
            full_name="Aria Sharma",
            college_id="QV123",
            email="aria@example.edu",
        )
        user.set_password("strongpass123")
        user.save()
        
        StudentProfile.objects.create(
            user=user,
            school=self.school,
            program=self.program,
            branch=self.branch,
            year="3"
        )

        response = self.client.post(
            "/api/users/register/",
            {
                "full_name": "Kabir Singh",
                "college_id": "QV123",
                "email": "kabir@example.edu",
                "school": self.school.id,
                "program": self.program.id,
                "branch": self.branch.id,
                "year": "2",
                "password": "strongpass123",
                "confirm_password": "strongpass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("college_id", response.data)

