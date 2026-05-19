import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from users.models import User
from quizzes.models import Quiz
from django.utils import timezone

admin_user = User.objects.get(email="admin@quizverse.edu")

# Create a sample quiz
quiz1, created = Quiz.objects.get_or_create(
    title="Cybersecurity Fundamentals",
    defaults={
        "description": "Test your knowledge of basic network security and encryption protocols.",
        "event_date": timezone.now() + timezone.timedelta(days=7),
        "status": Quiz.Status.REGISTRATION_OPEN,
        "visible_to_students": True,
        "is_registration_open": True,
        "max_participants": 100,
        "registration_fee": 0,
        "created_by": admin_user,
    }
)

if created:
    print(f"Created Quiz: {quiz1.title}")
else:
    print(f"Quiz already exists: {quiz1.title}")
    
quiz2, created = Quiz.objects.get_or_create(
    title="Data Structures Speed Run",
    defaults={
        "description": "Fast-paced questions on trees, graphs, and arrays.",
        "event_date": timezone.now() + timezone.timedelta(days=14),
        "status": Quiz.Status.UPCOMING,
        "visible_to_students": True,
        "is_registration_open": False,
        "max_participants": 50,
        "registration_fee": 15.00,
        "created_by": admin_user,
    }
)

if created:
    print(f"Created Quiz: {quiz2.title}")
else:
    print(f"Quiz already exists: {quiz2.title}")
