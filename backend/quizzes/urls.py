from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminQuizViewSet,
    AdminStatsView,
    MockPaymentView,
    MyRegistrationsView,
    PublishedQuizListView,
    QuizDetailView,
    StudentRegistrationView,
)

router = DefaultRouter()
router.register(r'', AdminQuizViewSet, basename='admin-quizzes')

urlpatterns = [
    # Admin routes
    path('admin-stats/', AdminStatsView.as_view(), name='admin-stats'),
    
    # Student routes
    path('published/', PublishedQuizListView.as_view(), name='published-quizzes'),
    path('my-registrations/', MyRegistrationsView.as_view(), name='my-registrations'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('<int:pk>/register/', StudentRegistrationView.as_view(), name='quiz-register'),
    path('<int:pk>/mock-payment/', MockPaymentView.as_view(), name='quiz-mock-payment'),

    # Router URLs last to avoid overriding specific student routes
    path('', include(router.urls)),
]
