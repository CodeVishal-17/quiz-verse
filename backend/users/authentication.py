from rest_framework.authentication import BaseAuthentication
from .models import User

def get_user_from_request_token(request):
    auth_header = request.headers.get("Authorization", "")
    token = request.headers.get("X-QuizVerse-Token", "")

    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    return User.objects.select_related(
        "student_profile__school",
        "student_profile__program",
        "student_profile__branch",
    ).filter(session_token=token, is_active=True).first()

class BearerTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        user = get_user_from_request_token(request)
        if user:
            return (user, None)
        return None

