from rest_framework import serializers
from users.serializers import UserPublicSerializer

from .models import Quiz, QuizRegistration


class QuizSerializer(serializers.ModelSerializer):
    registered_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'event_date', 
            'registration_open_date', 'registration_close_date', 
            'status', 'visible_to_students', 'is_registration_open', 'is_archived',
            'max_participants', 'registration_fee', 'banner_image', 
            'rules_instructions', 'allowed_schools', 'allowed_programs', 
            'allowed_branches', 'allowed_years', 'registered_count', 'remaining_seats',
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
