import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class Student(models.Model):
    YEAR_CHOICES = [
        ("1", "1st Year"),
        ("2", "2nd Year"),
        ("3", "3rd Year"),
        ("4", "4th Year"),
    ]

    full_name = models.CharField(max_length=120)
    college_id = models.CharField(max_length=40, unique=True)
    email = models.EmailField(unique=True)
    school = models.CharField(max_length=40)
    branch = models.CharField(max_length=80)
    year = models.CharField(max_length=1, choices=YEAR_CHOICES)
    password = models.CharField(max_length=128)
    session_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.college_id})"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def rotate_session_token(self):
        self.session_token = uuid.uuid4()
