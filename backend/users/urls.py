from django.urls import path

from .views import (
    AdminStudentBulkUploadView,
    AdminStudentDetailView,
    AdminStudentListView,
    AdminStudentTemplateDownloadView,
    BranchListView,
    CurrentUserView,
    LoginView,
    ProgramListView,
    SchoolListView,
    StudentChangePasswordView,
    SuperAdminManageAdminsView,
    SuperAdminManageAdminsDetailView,
)


urlpatterns = [
    path("schools/", SchoolListView.as_view(), name="school-list"),
    path("programs/", ProgramListView.as_view(), name="program-list"),
    path("branches/", BranchListView.as_view(), name="branch-list"),
    path("login/", LoginView.as_view(), name="student-login"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("change-password/", StudentChangePasswordView.as_view(), name="change-password"),
    path("admin/students/", AdminStudentListView.as_view(), name="admin-student-list"),
    path("admin/students/<int:pk>/", AdminStudentDetailView.as_view(), name="admin-student-detail"),
    path("admin/students/bulk-upload/", AdminStudentBulkUploadView.as_view(), name="admin-student-bulk-upload"),
    path("admin/students/download-template/", AdminStudentTemplateDownloadView.as_view(), name="admin-student-template"),
    path("admin/manage-admins/", SuperAdminManageAdminsView.as_view(), name="super-admin-manage-admins"),
    path("admin/manage-admins/<int:pk>/", SuperAdminManageAdminsDetailView.as_view(), name="super-admin-manage-admins-detail"),
]
