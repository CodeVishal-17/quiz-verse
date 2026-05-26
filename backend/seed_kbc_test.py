import os
import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from users.models import User
from quizzes.models import Quiz, Question, Choice

def seed_kbc_test_event():
    print("Initializing KBC Live Quiz Event Seeding...")

    # Get admin user
    try:
        admin_user = User.objects.get(email="admin@quizverse.edu")
    except User.DoesNotExist:
        print("Admin user 'admin@quizverse.edu' not found, using first admin...")
        admin_user = User.objects.filter(role="admin").first()
        if not admin_user:
            print("No admin user found. Creating one...")
            admin_user = User.objects.create_superuser(
                email="admin@quizverse.edu",
                password="adminpassword123",
                full_name="System Administrator",
                role="admin",
                college_id="ADMIN001"
            )

    # 1. Delete the KBC Live Test Quiz
    quiz_title = "KBC Arena Live Testing Quiz"
    deleted_count, _ = Quiz.objects.filter(title=quiz_title).delete()
    if deleted_count > 0:
        print(f"Successfully deleted quiz: '{quiz_title}'")
    else:
        print(f"Quiz '{quiz_title}' did not exist in the database.")


if __name__ == "__main__":
    seed_kbc_test_event()
