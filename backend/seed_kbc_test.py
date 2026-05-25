import os
import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from users.models import User
from quizzes.models import Quiz, Question, Choice

def seed_kbc_test_event():
    print("Initializing KBC Live Quiz Event Seeding...")

    # Get admin user
    try:
        admin_user = User.objects.get(email="admin@quizverse.edu")
    except User.DoesNotExist:
        print("Admin user 'admin@quizverse.edu' not found, using first admin...")
        admin_user = User.objects.filter(role="admin").first()
        if not admin_user:
            print("No admin user found. Creating one...")
            admin_user = User.objects.create_superuser(
                email="admin@quizverse.edu",
                password="adminpassword123",
                full_name="System Administrator",
                role="admin"
            )

    # 1. Recreate/Reset the KBC Live Test Quiz
    quiz_title = "KBC Arena Live Testing Quiz"
    Quiz.objects.filter(title=quiz_title).delete()

    quiz = Quiz.objects.create(
        title=quiz_title,
        description="A KBC-style live testing event pre-populated with active preliminary, fastest finger first, and hotseat questions. Join anytime to test the full game cycle!",
        event_date=timezone.now() + timezone.timedelta(days=30),
        status=Quiz.Status.REGISTRATION_OPEN,
        visible_to_students=True,
        is_registration_open=True,
        event_password="KBC123",
        registration_fee=0.00,  # Free so registration instantly gives 'paid' status
        max_participants=100,
        current_stage=Quiz.Stage.REGULAR,
        rules_instructions="1. Standard Preliminary Round: Answer 5 questions.\n2. Fastest Finger First (FFF): Sort the items in the correct order.\n3. Hotseat: 15 questions climb up the prize money ladder. Use 50:50, Audience Poll, or Switch Question lifelines!",
        created_by=admin_user
    )
    print(f"Created Quiz Event: '{quiz.title}' (Password: 'KBC123')")

    # Helper function to add a question with options
    def add_question(text, q_type, order, category, choices_dict):
        """
        choices_dict: {"Option text": is_correct_bool / correct_order_int, ...}
        """
        q = Question.objects.create(
            quiz=quiz,
            text=text,
            question_type=q_type,
            order=order,
            category=category,
            marks=1
        )
        for choice_text, val in choices_dict.items():
            if q_type in [Question.QuestionType.FFF_1, Question.QuestionType.FFF_2, Question.QuestionType.FFF_3]:
                Choice.objects.create(
                    question=q,
                    text=choice_text,
                    is_correct=False,
                    correct_order=val
                )
            else:
                Choice.objects.create(
                    question=q,
                    text=choice_text,
                    is_correct=val,
                    correct_order=None
                )
        return q

    # 2. Add 5 Preliminary Questions (regular)
    print("Seeding Preliminary Questions...")
    add_question(
        "Which planet is known as the Red Planet?",
        Question.QuestionType.REGULAR, 1, "Science",
        {"Venus": False, "Mars": True, "Jupiter": False, "Saturn": False}
    )
    add_question(
        "Who is the author of the play 'Romeo and Juliet'?",
        Question.QuestionType.REGULAR, 2, "General",
        {"Charles Dickens": False, "William Shakespeare": True, "Jane Austen": False, "Leo Tolstoy": False}
    )
    add_question(
        "What is the capital city of Australia?",
        Question.QuestionType.REGULAR, 3, "General",
        {"Sydney": False, "Melbourne": False, "Canberra": True, "Brisbane": False}
    )
    add_question(
        "Which element has the chemical symbol 'O'?",
        Question.QuestionType.REGULAR, 4, "Science",
        {"Osmium": False, "Oxygen": True, "Gold": False, "Hydrogen": False}
    )
    add_question(
        "Which sport is associated with the term 'Double Fault'?",
        Question.QuestionType.REGULAR, 5, "Sports",
        {"Tennis": True, "Cricket": False, "Football": False, "Basketball": False}
    )

    # 3. Add 3 FFF Questions (1 per batch)
    print("Seeding Fastest Finger First (FFF) Questions...")
    # Batch 1 FFF
    add_question(
        "Arrange these Indian monuments in chronological order of construction (earliest first):",
        Question.QuestionType.FFF_1, 1, "History",
        {
            "Qutub Minar": 1,
            "Taj Mahal": 2,
            "Red Fort": 3,
            "Gateway of India": 4
        }
    )
    # Batch 2 FFF
    add_question(
        "Arrange these numbers in increasing order:",
        Question.QuestionType.FFF_2, 1, "General",
        {
            "5": 1,
            "25": 2,
            "50": 3,
            "100": 4
        }
    )
    # Batch 3 FFF
    add_question(
        "Arrange these tech companies by their founding year, earliest first:",
        Question.QuestionType.FFF_3, 1, "Science",
        {
            "Microsoft": 1,
            "Apple": 2,
            "Google": 3,
            "Facebook": 4
        }
    )

    # 4. Seed Hotseat Questions (15 core + 5 backup category questions per batch)
    for batch_num, q_type in [(1, Question.QuestionType.HOTSEAT_1), 
                             (2, Question.QuestionType.HOTSEAT_2), 
                             (3, Question.QuestionType.HOTSEAT_3)]:
        print(f"Seeding Hotseat Questions for Batch {batch_num}...")
        
        # Q1 to Q15 (progressive difficulty)
        add_question("Q1: What is the capital of France?", q_type, 1, "General", 
                     {"Berlin": False, "Paris": True, "Madrid": False, "London": False})
        
        add_question("Q2: In which decade did the Titanic sink?", q_type, 2, "History", 
                     {"1890s": False, "1900s": False, "1910s": True, "1920s": False})
        
        add_question("Q3: Which actor played the lead role in the movie 'Gangs of Wasseypur'?", q_type, 3, "Bollywood", 
                     {"Manoj Bajpayee": True, "Shah Rukh Khan": False, "Salman Khan": False, "Aamir Khan": False})
        
        add_question("Q4: How many elements are in the periodic table?", q_type, 4, "Science", 
                     {"112": False, "118": True, "120": False, "92": False})
        
        add_question("Q5 [CHECKPOINT]: Who holds the record for the most centuries in Test Cricket?", q_type, 5, "Sports", 
                     {"Ricky Ponting": False, "Sachin Tendulkar": True, "Virat Kohli": False, "Jacques Kallis": False})
        
        add_question("Q6: What is the chemical formula of Table Salt?", q_type, 6, "Science", 
                     {"HCl": False, "H2O": False, "NaCl": True, "CO2": False})
        
        add_question("Q7: Which country is known as the Land of the Rising Sun?", q_type, 7, "General", 
                     {"China": False, "Japan": True, "South Korea": False, "Thailand": False})
        
        add_question("Q8: In which year did India win its first Cricket World Cup?", q_type, 8, "Sports", 
                     {"1975": False, "1983": True, "1999": False, "2011": False})
        
        add_question("Q9: Who was the first Mughal Emperor of India?", q_type, 9, "History", 
                     {"Akbar": False, "Babur": True, "Humayun": False, "Shah Jahan": False})
        
        add_question("Q10 [CHECKPOINT]: Which Bollywood movie won the National Film Award for Best Popular Film in 2023?", q_type, 10, "Bollywood", 
                     {"Pathaan": False, "RRR": True, "Jawan": False, "Drishyam 2": False})
        
        add_question("Q11: What is the largest organ in the human body?", q_type, 11, "Science", 
                     {"Liver": False, "Heart": False, "Skin": True, "Lungs": False})
        
        add_question("Q12: Which currency is used in Japan?", q_type, 12, "General", 
                     {"Yuan": False, "Won": False, "Yen": True, "Ringgit": False})
        
        add_question("Q13: Who was the first President of the United States?", q_type, 13, "History", 
                     {"Thomas Jefferson": False, "Abraham Lincoln": False, "George Washington": True, "John Adams": False})
        
        add_question("Q14: In which Bollywood movie did Amitabh Bachchan play the character 'Vijay Deenanath Chauhan'?", q_type, 14, "Bollywood", 
                     {"Deewaar": False, "Agneepath": True, "Sholay": False, "Don": False})
        
        add_question("Q15 [WINNER]: What is the distance from the Earth to the Sun in millions of kilometers?", q_type, 15, "Science", 
                     {"150": True, "93": False, "384": False, "100": False})

        # 5 Backup Questions for Switch Question Lifeline (Representing different categories)
        print(f"Seeding Switch Question Backup Questions for Batch {batch_num}...")
        add_question("[SWITCH-BACKUP] What is the speed of light in a vacuum?", q_type, 16, "Science", 
                     {"300,000 km/s": True, "150,000 km/s": False, "500,000 km/s": False, "1,000,000 km/s": False})
        
        add_question("[SWITCH-BACKUP] Which actress starred in the Bollywood movie 'Queen'?", q_type, 17, "Bollywood", 
                     {"Deepika Padukone": False, "Kangana Ranaut": True, "Alia Bhatt": False, "Katrina Kaif": False})
        
        add_question("[SWITCH-BACKUP] In which year did the French Revolution begin?", q_type, 18, "History", 
                     {"1789": True, "1799": False, "1804": False, "1776": False})
        
        add_question("[SWITCH-BACKUP] How many players are there on a standard Basketball team on the court?", q_type, 19, "Sports", 
                     {"5": True, "6": False, "7": False, "11": False})
        
        add_question("[SWITCH-BACKUP] What is the largest ocean on Earth?", q_type, 20, "General", 
                     {"Atlantic Ocean": False, "Indian Ocean": False, "Pacific Ocean": True, "Arctic Ocean": False})

    print(f"\nSUCCESS: Seeding completed for quiz event '{quiz_title}'!")
    print("Registered students can now verify access with Player ID and Password 'KBC123' anytime!")

if __name__ == "__main__":
    seed_kbc_test_event()
