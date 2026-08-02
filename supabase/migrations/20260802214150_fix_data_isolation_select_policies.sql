/*
# Fix data isolation: scope SELECT policies per user

## Problem
Several tables had `USING (true)` SELECT policies, meaning any authenticated
user could see ALL rows — not just their own. This caused a new account to see
assignments, quizzes, groups, and profiles belonging to other users.

## Changes
1. `assignments` SELECT — teacher sees own; student sees ones assigned to them
2. `student_assignments` SELECT — student sees own; teacher sees for own assignments
3. `groups` SELECT — teacher sees own; student sees groups they belong to
4. `group_members` SELECT — student sees own memberships; teacher sees members of own groups
5. `profiles` SELECT — user sees self, their students (if teacher), or their teacher (if student)
*/

-- assignments: teacher sees own, student sees ones assigned to them
DROP POLICY IF EXISTS "assignments_select" ON assignments;
CREATE POLICY "assignments_select" ON assignments FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM student_assignments sa
      WHERE sa.assignment_id = assignments.id AND sa.student_id = auth.uid()
    )
  );

-- student_assignments: student sees own, teacher sees for assignments they own
DROP POLICY IF EXISTS "student_assignments_select" ON student_assignments;
CREATE POLICY "student_assignments_select" ON student_assignments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_assignments.assignment_id AND a.teacher_id = auth.uid()
    )
  );

-- groups: teacher sees own, student sees groups they're members of
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.student_id = auth.uid()
    )
  );

-- group_members: student sees own, teacher sees members of own groups
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.teacher_id = auth.uid()
    )
  );

-- profiles: self, own students, or own teacher
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.teacher_id = profiles.id
    )
  );
