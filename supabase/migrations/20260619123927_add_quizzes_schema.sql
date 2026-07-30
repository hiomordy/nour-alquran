-- Enable RLS

-- Quizzes table: teacher assigns quiz to student
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  surah_number INTEGER NOT NULL,
  surah_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  score INTEGER,
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Quiz questions generated when quiz is created
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('missing_word', 'next_ayah', 'surah_name', 'order_ayahs')),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options TEXT[] NOT NULL,
  ayah_reference TEXT,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz answers recorded when student takes quiz
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Policies for quizzes
CREATE POLICY "select_quizzes_teacher" ON quizzes FOR SELECT
  TO authenticated USING (auth.uid() = teacher_id OR auth.uid() = student_id);
CREATE POLICY "insert_quizzes_teacher" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "update_quizzes_teacher" ON quizzes FOR UPDATE
  TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "delete_quizzes_teacher" ON quizzes FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- Policies for quiz_questions
CREATE POLICY "select_quiz_questions" ON quiz_questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND (quizzes.teacher_id = auth.uid() OR quizzes.student_id = auth.uid()))
  );
CREATE POLICY "insert_quiz_questions" ON quiz_questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.teacher_id = auth.uid())
  );
CREATE POLICY "delete_quiz_questions" ON quiz_questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.teacher_id = auth.uid())
  );

-- Policies for quiz_answers
CREATE POLICY "select_quiz_answers" ON quiz_answers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_answers.quiz_id AND (quizzes.teacher_id = auth.uid() OR quizzes.student_id = auth.uid()))
  );
CREATE POLICY "insert_quiz_answers" ON quiz_answers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_answers.quiz_id AND quizzes.student_id = auth.uid())
  );
CREATE POLICY "delete_quiz_answers" ON quiz_answers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_answers.quiz_id AND quizzes.student_id = auth.uid())
  );
