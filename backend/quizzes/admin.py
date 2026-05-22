from django.contrib import admin

# Register your models here.
from quizzes.models import Quiz, QuizRegistration, Question, Choice, QuizAttempt, StudentAnswer

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]
    list_display = ('quiz', 'order', 'text', 'marks')
    list_filter = ('quiz',)

admin.site.register(Quiz)
admin.site.register(QuizRegistration)
admin.site.register(QuizAttempt)
admin.site.register(StudentAnswer)
