from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Branch, Program, School, User
from .serializers import (
    BranchSerializer,
    LoginSerializer,
    ProgramSerializer,
    RegistrationSerializer,
    SchoolSerializer,
    StudentPublicSerializer,
    UserPublicSerializer,
)


from .authentication import get_user_from_request_token


class SchoolListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, _request):
        schools = School.objects.all()
        return Response(SchoolSerializer(schools, many=True).data)


class ProgramListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        school_id = request.query_params.get("school_id") or request.query_params.get("school")
        programs = Program.objects.select_related("school")

        if school_id:
            programs = programs.filter(school_id=school_id)

        return Response(ProgramSerializer(programs, many=True).data)


class BranchListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        program_id = request.query_params.get("program_id") or request.query_params.get("program")
        branches = Branch.objects.select_related("program")

        if program_id:
            branches = branches.filter(program_id=program_id)

        return Response(BranchSerializer(branches, many=True).data)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": "Registration successful.",
                "token": str(user.session_token),
                "role": user.role,
                "user": UserPublicSerializer(user).data,
                "student": StudentPublicSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.rotate_session_token()
        user.last_login_at = timezone.now()
        user.save(update_fields=["session_token", "last_login_at", "updated_at"])

        return Response(
            {
                "message": "Login successful.",
                "token": str(user.session_token),
                "role": user.role,
                "user": UserPublicSerializer(user).data,
                "student": StudentPublicSerializer(user).data,
            }
        )


class CurrentUserView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        user = get_user_from_request_token(request)

        if user is None:
            return Response({"detail": "Authentication credentials were not provided or are invalid."}, status=401)

        return Response(
            {
                "role": user.role,
                "user": UserPublicSerializer(user).data,
            }
        )
