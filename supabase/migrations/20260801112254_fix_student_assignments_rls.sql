/*
# Fix student_assignments RLS: allow teachers to insert and delete

## Problem
The `student_assignments` table had no INSERT policy for teachers and no DELETE policy.
Teachers need to create student_assignment rows when they assign an assignment to students,
and need to delete them when removing an assignment.

## Changes
1. Add INSERT policy: teachers can insert student_assignments for assignments they own
2. Add DELETE policy: teachers can delete student_assignments for assignments they own
3. Students can already insert their own rows (existing policy) and update (existing policy)
*/

DROP POLICY IF EXISTS "student_assignments_insert" ON student_assignments;
CREATE POLICY "student_assignments_insert" ON student_assignments FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_assignments.assignment_id AND a.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_assignments_delete" ON student_assignments;
CREATE POLICY "student_assignments_delete" ON student_assignments FOR DELETE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_assignments.assignment_id AND a.teacher_id = auth.uid()
    )
  );
