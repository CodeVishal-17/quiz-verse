from django.urls import path

from .views import BranchListView, CurrentUserView, LoginView, ProgramListView, RegisterView, SchoolListView


urlpatterns = [
    path("schools/", SchoolListView.as_view(), name="school-list"),
    path("programs/", ProgramListView.as_view(), name="program-list"),
    path("branches/", BranchListView.as_view(), name="branch-list"),
    path("register/", RegisterView.as_view(), name="student-register"),
    path("login/", LoginView.as_view(), name="student-login"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
