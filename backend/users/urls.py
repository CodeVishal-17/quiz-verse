from django.urls import path

from .views import LoginView, RegisterView


urlpatterns = [
    path("register/", RegisterView.as_view(), name="student-register"),
    path("login/", LoginView.as_view(), name="student-login"),
]
