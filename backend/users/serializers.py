from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Student


class StudentPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "id",
            "full_name",
            "college_id",
            "email",
            "school",
            "branch",
            "year",
            "created_at",
        ]


class RegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    college_id = serializers.CharField(max_length=40)
    email = serializers.EmailField()
    school = serializers.CharField(max_length=40)
    branch = serializers.CharField(max_length=80)
    year = serializers.ChoiceField(choices=Student.YEAR_CHOICES)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_college_id(self, value):
        college_id = value.strip()
        if Student.objects.filter(college_id__iexact=college_id).exists():
            raise serializers.ValidationError("A student with this college ID already exists.")
        return college_id

    def validate_email(self, value):
        email = value.strip().lower()
        if Student.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A student with this email already exists.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        raw_password = validated_data.pop("password")

        student = Student(**validated_data)
        student.set_password(raw_password)

        try:
            with transaction.atomic():
                student.save()
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": "A student with this college ID or email already exists."}
            ) from exc

        return student


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=120)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        password = attrs["password"]

        student = (
            Student.objects.filter(college_id__iexact=identifier).first()
            or Student.objects.filter(email__iexact=identifier.lower()).first()
        )

        if student is None or not student.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid college ID/email or password."})

        attrs["student"] = student
        return attrs
