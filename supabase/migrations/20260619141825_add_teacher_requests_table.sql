CREATE TABLE IF NOT EXISTS teacher_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_teacher_requests" ON teacher_requests FOR SELECT
  TO authenticated USING (auth.uid() = teacher_id OR auth.uid() = student_id);
CREATE POLICY "insert_teacher_requests" ON teacher_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "update_teacher_requests" ON teacher_requests FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "delete_teacher_requests" ON teacher_requests FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id OR auth.uid() = student_id);
