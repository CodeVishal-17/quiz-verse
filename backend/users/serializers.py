from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Branch, Program, School, StudentProfile, User


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "school_name", "school_code"]


class ProgramSerializer(serializers.ModelSerializer):
    school_code = serializers.CharField(source="school.school_code", read_only=True)

    class Meta:
        model = Program
        fields = ["id", "school", "school_code", "program_name", "program_code"]


class BranchSerializer(serializers.ModelSerializer):
    program_code = serializers.CharField(source="program.program_code", read_only=True)

    class Meta:
        model = Branch
        fields = ["id", "program", "program_code", "branch_name", "branch_code"]


class UserPublicSerializer(serializers.ModelSerializer):
    school = serializers.SerializerMethodField()
    school_name = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()
    program_name = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    year = serializers.SerializerMethodField()
    last_badge = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "college_id",
            "email",
            "role",
            "school",
            "school_name",
            "program",
            "program_name",
            "branch",
            "branch_name",
            "year",
            "last_badge",
            "created_at",
        ]

    def get_profile(self, obj):
        return getattr(obj, "student_profile", None)

    def get_school(self, obj):
        profile = self.get_profile(obj)
        return profile.school.school_code if profile else None

    def get_school_name(self, obj):
        profile = self.get_profile(obj)
        return profile.school.school_name if profile else None

    def get_program(self, obj):
        profile = self.get_profile(obj)
        return profile.program.program_code if profile else None

    def get_program_name(self, obj):
        profile = self.get_profile(obj)
        return profile.program.program_name if profile else None

    def get_branch(self, obj):
        profile = self.get_profile(obj)
        return profile.branch.branch_code if profile else None

    def get_branch_name(self, obj):
        profile = self.get_profile(obj)
        return profile.branch.branch_name if profile else None

    def get_year(self, obj):
        profile = self.get_profile(obj)
        return profile.year if profile else None

    def get_last_badge(self, obj):
        profile = self.get_profile(obj)
        return profile.last_badge if profile else None


StudentPublicSerializer = UserPublicSerializer


class RegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120, required=False)
    fullName = serializers.CharField(max_length=120, required=False, write_only=True)
    college_id = serializers.CharField(max_length=40, required=False)
    collegeId = serializers.CharField(max_length=40, required=False, write_only=True)
    email = serializers.EmailField()
    school = serializers.PrimaryKeyRelatedField(queryset=School.objects.all())
    program = serializers.PrimaryKeyRelatedField(queryset=Program.objects.select_related("school").all())
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.select_related("program").all())
    year = serializers.ChoiceField(choices=StudentProfile.Year.choices)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    confirm_password = serializers.CharField(required=False, write_only=True, trim_whitespace=False)
    confirmPassword = serializers.CharField(required=False, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        attrs["full_name"] = attrs.get("full_name") or attrs.pop("fullName", "")
        attrs["college_id"] = attrs.get("college_id") or attrs.pop("collegeId", "")
        attrs["confirm_password"] = attrs.get("confirm_password") or attrs.pop("confirmPassword", "")

        if not attrs["full_name"].strip():
            raise serializers.ValidationError({"full_name": "Full name is required."})
        if not attrs["college_id"].strip():
            raise serializers.ValidationError({"college_id": "College ID is required."})
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs["program"].school_id != attrs["school"].id:
            raise serializers.ValidationError({"program": "Program does not belong to the selected school."})
        if attrs["branch"].program_id != attrs["program"].id:
            raise serializers.ValidationError({"branch": "Branch does not belong to the selected program."})

        attrs["full_name"] = attrs["full_name"].strip()
        attrs["college_id"] = attrs["college_id"].strip()
        attrs["email"] = attrs["email"].strip().lower()

        if User.objects.filter(college_id__iexact=attrs["college_id"]).exists():
            raise serializers.ValidationError({"college_id": "A user with this college ID already exists."})
        if User.objects.filter(email__iexact=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        return attrs

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)
        school = validated_data.pop("school")
        program = validated_data.pop("program")
        branch = validated_data.pop("branch")
        year = validated_data.pop("year")

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    password=raw_password,
                    role=User.Role.STUDENT,
                    **validated_data,
                )
                StudentProfile.objects.create(
                    user=user,
                    school=school,
                    program=program,
                    branch=branch,
                    year=year,
                )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": "A user with this college ID or email already exists."}
            ) from exc

        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = (attrs.get("identifier") or attrs.get("email") or "").strip()
        password = attrs["password"]

        if not identifier:
            raise serializers.ValidationError({"email": "Email is required."})

        user = (
            User.objects.filter(college_id__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier.lower()).first()
        )

        if user is None or not user.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive."})

        attrs["user"] = user
        return attrs
