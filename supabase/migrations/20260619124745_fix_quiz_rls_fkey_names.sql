-- Fix RLS policies for quiz_questions and quiz_answers
-- The actual FK names are quizzes_student_id_fkey1 and quizzes_teacher_id_fkey1

DROP POLICY IF EXISTS "select_quiz_questions" ON quiz_questions;
DROP POLICY IF EXISTS "insert_quiz_questions" ON quiz_questions;
DROP POLICY IF EXISTS "delete_quiz_questions" ON quiz_questions;

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

DROP POLICY IF EXISTS "select_quiz_answers" ON quiz_answers;
DROP POLICY IF EXISTS "insert_quiz_answers" ON quiz_answers;
DROP POLICY IF EXISTS "delete_quiz_answers" ON quiz_answers;

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
