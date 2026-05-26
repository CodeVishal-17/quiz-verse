from rest_framework import serializers
from users.serializers import UserPublicSerializer

from quizzes.models import Quiz, QuizRegistration


class QuizSerializer(serializers.ModelSerializer):
    registered_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.SerializerMethodField()
    hotseat_player_1_name = serializers.CharField(source='hotseat_player_1.full_name', read_only=True)
    hotseat_player_2_name = serializers.CharField(source='hotseat_player_2.full_name', read_only=True)
    hotseat_player_3_name = serializers.CharField(source='hotseat_player_3.full_name', read_only=True)
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'event_date', 
            'registration_open_date', 'registration_close_date', 
            'status', 'visible_to_students', 'is_registration_open', 'is_archived',
            'max_participants', 'registration_fee', 'banner_image', 
            'rules_instructions', 'allowed_schools', 'allowed_programs', 
            'allowed_branches', 'allowed_years', 'registered_count', 'remaining_seats',
            'event_password', 'current_stage', 'top_30_selected', 
            'batch_1_players', 'batch_2_players', 'batch_3_players',
            'hotseat_player_1', 'hotseat_player_2', 'hotseat_player_3',
            'hotseat_player_1_name', 'hotseat_player_2_name', 'hotseat_player_3_name',
            'hotseat_score_1', 'hotseat_score_2', 'hotseat_score_3',
            'hotseat_status_1', 'hotseat_status_2', 'hotseat_status_3',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
        
    def get_remaining_seats(self, obj):
        if obj.max_participants is None:
            return None
        count = getattr(obj, 'registered_count', 0)
        return max(0, obj.max_participants - count)


class QuizRegistrationSerializer(serializers.ModelSerializer):
    quiz_details = QuizSerializer(source='quiz', read_only=True)
    
    class Meta:
        model = QuizRegistration
        fields = [
            'id', 'quiz', 'quiz_details', 'registered_at', 'updated_at',
            'payment_status', 'sequence_number', 'player_id'
        ]
        read_only_fields = [
            'registered_at', 'updated_at', 'payment_status', 
            'sequence_number', 'player_id', 'quiz_details'
        ]

class EnrolledStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    college_id = serializers.CharField(source='student.college_id', read_only=True)

    class Meta:
        model = QuizRegistration
        fields = [
            'id', 'student_name', 'student_email', 'college_id',
            'payment_status', 'sequence_number', 'player_id', 'registered_at'
        ]

from quizzes.models import Question, Choice, QuizAttempt, StudentAnswer

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text']
        # Do not include is_correct so students can't inspect the API

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'order', 'marks', 'question_type', 'category', 'choices', 'trivia']

class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'started_at', 'completed_at', 'score', 'current_question_index']

from quizzes.models import Team

class TeamSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'quiz', 'leader', 'leader_name', 'members', 'member_names', 'created_at']
        read_only_fields = ['leader', 'members', 'quiz']

    def get_member_names(self, obj):
        return [m.full_name for m in obj.members.all()]
        read_only_fields = ['started_at', 'completed_at', 'score', 'current_question_index']


from quizzes.models import FFFAnswer, HotseatAttempt

class FFFAnswerSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    player_id = serializers.SerializerMethodField()

    class Meta:
        model = FFFAnswer
        fields = ['id', 'quiz', 'student', 'student_name', 'player_id', 'batch_number', 'question', 'selected_choice', 'time_taken_seconds', 'submitted_at', 'is_correct', 'submitted_sequence']
        read_only_fields = ['submitted_at']

    def get_player_id(self, obj):
        reg = QuizRegistration.objects.filter(student=obj.student, quiz=obj.quiz).first()
        return reg.player_id if reg else ""


class HotseatAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    player_id = serializers.SerializerMethodField()

    class Meta:
        model = HotseatAttempt
        fields = [
            'id', 'quiz', 'student', 'student_name', 'player_id', 'batch_number', 
            'current_question_index', 'score', 'status', 'lifeline_5050_used', 
            'lifeline_poll_used', 'lifeline_switch_used', 'started_at', 'completed_at',
            'pending_lifeline_type', 'pending_lifeline_switch_category', 
            'lifeline_request_status', 'approved_lifeline_data',
            'timer_is_paused', 'options_visible', 'showing_question', 'show_intro'
        ]
        read_only_fields = ['started_at', 'completed_at']

    def get_player_id(self, obj):
        reg = QuizRegistration.objects.filter(student=obj.student, quiz=obj.quiz).first()
        return reg.player_id if reg else ""
