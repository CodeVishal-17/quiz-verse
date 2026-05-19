from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Branch, Program, School, StudentProfile, User


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 0


class BranchInline(admin.TabularInline):
    model = Branch
    extra = 0


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("school_name", "school_code")
    search_fields = ("school_name", "school_code")
    inlines = [ProgramInline]


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("program_name", "program_code", "school")
    search_fields = ("program_name", "program_code", "school__school_name", "school__school_code")
    list_filter = ("school",)
    inlines = [BranchInline]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("branch_name", "branch_code", "program", "school")
    search_fields = ("branch_name", "branch_code", "program__program_name")
    list_filter = ("program__school", "program")

    @admin.display(ordering="program__school__school_name")
    def school(self, obj):
        return obj.program.school


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "school", "program", "branch", "year", "last_badge")
    search_fields = ("user__full_name", "user__college_id", "user__email")
    list_filter = ("school", "program", "branch", "year")


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("full_name", "college_id", "email", "role", "is_staff", "created_at")
    list_filter = ("role", "is_staff", "is_active", "created_at")
    search_fields = ("full_name", "college_id", "email")
    ordering = ("-created_at",)
    readonly_fields = ("session_token", "last_login_at", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "college_id", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Session", {"fields": ("session_token", "last_login_at")}),
        ("Important dates", {"fields": ("created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "full_name",
                    "college_id",
                    "email",
                    "role",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )
