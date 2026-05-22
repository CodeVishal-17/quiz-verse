from django.urls import include, path
from rest_framework.routers import DefaultRouter

from quizzes.views import (
    AdminQuizViewSet,
    AdminStatsView,
    MockPaymentView,
    MyRegistrationsView,
    PublishedQuizListView,
    QuizDetailView,
    StudentRegistrationView,
    QuizAttemptStartView,
    QuizAttemptNextQuestionView,
    QuizAttemptSubmitAnswerView,
    StudentTeamViewSet,
    VerifyQuizAccessView,
    QuizLiveStateView,
    FFFSubmitView,
    HotseatQuestionView,
    HotseatSubmitView,
    HotseatLifelineView,
    HotseatWalkAwayView,
)

router = DefaultRouter()
router.register(r'admin', AdminQuizViewSet, basename='admin-quizzes')
router.register(r'teams', StudentTeamViewSet, basename='student-teams')

urlpatterns = [
    # Admin routes
    path('admin-stats/', AdminStatsView.as_view(), name='admin-stats'),
    
    # Student routes
    path('published/', PublishedQuizListView.as_view(), name='published-quizzes'),
    path('my-registrations/', MyRegistrationsView.as_view(), name='my-registrations'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('<int:pk>/register/', StudentRegistrationView.as_view(), name='quiz-register'),
    path('<int:pk>/mock-payment/', MockPaymentView.as_view(), name='quiz-mock-payment'),
    
    # Quiz attempt flow
    path('<int:pk>/start/', QuizAttemptStartView.as_view(), name='quiz-start'),
    path('<int:pk>/next/', QuizAttemptNextQuestionView.as_view(), name='quiz-next-question'),
    path('<int:pk>/submit/', QuizAttemptSubmitAnswerView.as_view(), name='quiz-submit-answer'),

    # KBC Live Arena routes
    path('<int:pk>/verify-access/', VerifyQuizAccessView.as_view(), name='quiz-verify-access'),
    path('<int:pk>/live-state/', QuizLiveStateView.as_view(), name='quiz-live-state'),
    path('<int:pk>/fff-submit/', FFFSubmitView.as_view(), name='quiz-fff-submit'),
    path('<int:pk>/hotseat-question/', HotseatQuestionView.as_view(), name='quiz-hotseat-question'),
    path('<int:pk>/hotseat-submit/', HotseatSubmitView.as_view(), name='quiz-hotseat-submit'),
    path('<int:pk>/hotseat-lifeline/', HotseatLifelineView.as_view(), name='quiz-hotseat-lifeline'),
    path('<int:pk>/hotseat-walk-away/', HotseatWalkAwayView.as_view(), name='quiz-hotseat-walk-away'),

    # Router URLs last to avoid overriding specific student routes
    path('', include(router.urls)),
]

