from django.test import TestCase
from rest_framework.test import APIClient

from .models import Student


class StudentAuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_student_can_register_and_login(self):
        payload = {
            "full_name": "Aria Sharma",
            "college_id": "QV123",
            "email": "aria@example.edu",
            "school": "SOET",
            "branch": "CSE",
            "year": "3",
            "password": "strongpass123",
            "confirm_password": "strongpass123",
        }

        register_response = self.client.post("/api/users/register/", payload, format="json")

        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(Student.objects.count(), 1)
        self.assertNotEqual(Student.objects.get().password, payload["password"])
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
        student = Student(
            full_name="Aria Sharma",
            college_id="QV123",
            email="aria@example.edu",
            school="SOET",
            branch="CSE",
            year="3",
        )
        student.set_password("strongpass123")
        student.save()

        response = self.client.post(
            "/api/users/register/",
            {
                "full_name": "Kabir Singh",
                "college_id": "QV123",
                "email": "kabir@example.edu",
                "school": "SOSC",
                "branch": "OTHER",
                "year": "2",
                "password": "strongpass123",
                "confirm_password": "strongpass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("college_id", response.data)
