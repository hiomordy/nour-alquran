
-- Add penalty fields to student_assignments
ALTER TABLE student_assignments
  ADD COLUMN IF NOT EXISTS penalty_xp integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS penalty_applied boolean NOT NULL DEFAULT false;
