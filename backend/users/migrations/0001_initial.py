# Generated for QuizVerse backend foundation.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="School",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("school_name", models.CharField(max_length=160)),
                ("school_code", models.CharField(max_length=20, unique=True)),
            ],
            options={"ordering": ["school_name"]},
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False)),
                ("full_name", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("college_id", models.CharField(max_length=40, unique=True)),
                ("role", models.CharField(choices=[("student", "Student"), ("admin", "Admin")], default="student", max_length=20)),
                ("session_token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("last_login_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("groups", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Program",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("program_name", models.CharField(max_length=180)),
                ("program_code", models.CharField(max_length=40)),
                ("school", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="programs", to="users.school")),
            ],
            options={"ordering": ["program_name"]},
        ),
        migrations.CreateModel(
            name="Branch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("branch_name", models.CharField(max_length=180)),
                ("branch_code", models.CharField(max_length=40)),
                ("program", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branches", to="users.program")),
            ],
            options={"ordering": ["branch_name"]},
        ),
        migrations.CreateModel(
            name="StudentProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.CharField(choices=[("1", "1st Year"), ("2", "2nd Year"), ("3", "3rd Year"), ("4", "4th Year")], max_length=1)),
                ("profile_picture", models.ImageField(blank=True, null=True, upload_to="student_profiles/")),
                ("last_badge", models.CharField(blank=True, max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="student_profiles", to="users.branch")),
                ("program", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="student_profiles", to="users.program")),
                ("school", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="student_profiles", to="users.school")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="student_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["user__full_name"]},
        ),
        migrations.AddConstraint(
            model_name="program",
            constraint=models.UniqueConstraint(fields=("school", "program_code"), name="unique_program_code_per_school"),
        ),
        migrations.AddConstraint(
            model_name="branch",
            constraint=models.UniqueConstraint(fields=("program", "branch_code"), name="unique_branch_code_per_program"),
        ),
    ]
