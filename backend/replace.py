import re

with open('quizzes/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'def upload_questions(' in line:
        start_idx = i - 1
        for j in range(i, len(lines)):
            if 'class QuizAttemptStartView(APIView):' in lines[j]:
                end_idx = j - 2
                break
        
        break

replacement = """    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def upload_questions(self, request, pk=None):
        quiz = self.get_object()
        if 'file' not in request.FILES:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        file = request.FILES['file']
        if not file.name.endswith('.xlsx'):
            return Response({"detail": "Please upload an Excel (.xlsx) file."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
            
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) <= 1:
                return Response({"detail": "No questions found in Excel file."}, status=status.HTTP_400_BAD_REQUEST)
                
            created_count = 0
            
            with transaction.atomic():
                quiz.questions.all().delete()
                
                for idx, row in enumerate(rows[1:], start=1):
                    if not row or not row[0]:
                        continue
                        
                    text = str(row[0]).strip()
                    opt_a = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                    opt_b = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                    opt_c = str(row[3]).strip() if len(row) > 3 and row[3] else ''
                    opt_d = str(row[4]).strip() if len(row) > 4 and row[4] else ''
                    correct_opt = str(row[5]).strip().upper() if len(row) > 5 and row[5] else 'A'
                    marks = int(row[6]) if len(row) > 6 and row[6] is not None else 1
                    
                    question = Question.objects.create(quiz=quiz, text=text, order=idx, marks=marks)
                    
                    if opt_a: Choice.objects.create(question=question, text=opt_a, is_correct=(correct_opt == 'A'))
                    if opt_b: Choice.objects.create(question=question, text=opt_b, is_correct=(correct_opt == 'B'))
                    if opt_c: Choice.objects.create(question=question, text=opt_c, is_correct=(correct_opt == 'C'))
                    if opt_d: Choice.objects.create(question=question, text=opt_d, is_correct=(correct_opt == 'D'))
                    
                    created_count += 1
                    
            return Response({"detail": f"Successfully imported {created_count} questions."})
            
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)\n\n"""
            
lines[start_idx:end_idx+1] = [replacement]

with open('quizzes/views.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
