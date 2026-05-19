from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from users.views import BranchListView, ProgramListView, SchoolListView


def health_check(_request):
    return JsonResponse({"status": "ok", "service": "quizverse-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/schools/", SchoolListView.as_view(), name="school-list"),
    path("api/programs/", ProgramListView.as_view(), name="program-list"),
    path("api/branches/", BranchListView.as_view(), name="branch-list"),
    path("api/users/", include("users.urls")),
    path("api/quizzes/", include("quizzes.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
