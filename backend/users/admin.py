from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("full_name", "college_id", "email", "school", "branch", "year", "created_at")
    search_fields = ("full_name", "college_id", "email")
    list_filter = ("school", "branch", "year", "created_at")
    readonly_fields = ("session_token", "created_at", "updated_at", "last_login_at")
