from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegistrationSerializer, StudentPublicSerializer


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        return Response(
            {
                "message": "Registration successful.",
                "token": str(student.session_token),
                "student": StudentPublicSerializer(student).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = serializer.validated_data["student"]
        student.rotate_session_token()
        student.last_login_at = timezone.now()
        student.save(update_fields=["session_token", "last_login_at", "updated_at"])

        return Response(
            {
                "message": "Login successful.",
                "token": str(student.session_token),
                "student": StudentPublicSerializer(student).data,
            }
        )
