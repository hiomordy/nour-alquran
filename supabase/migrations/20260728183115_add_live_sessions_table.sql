/*
# Add live sessions table (Zoom-like live video classes)

1. New Tables
- `live_sessions`
  - `id` (uuid, primary key)
  - `teacher_id` (uuid, references profiles.id) — the teacher who owns the room
  - `title` (text) — session title
  - `description` (text, nullable) — optional description
  - `room_code` (text, unique) — short 6-char code students use to join
  - `status` (text, enum: scheduled/live/ended) — current state
  - `scheduled_at` (timestamptz, nullable) — when the session is planned
  - `started_at` (timestamptz, nullable) — when it went live
  - `ended_at` (timestamptz, nullable) — when it ended
  - `created_at` (timestamptz default now)
- `live_participants`
  - `id` (uuid, primary key)
  - `session_id` (uuid, references live_sessions.id ON DELETE CASCADE)
  - `user_id` (uuid, references profiles.id)
  - `joined_at` (timestamptz default now)
  - `left_at` (timestamptz, nullable)
  - `is_hand_raised` (boolean default false) — student raises hand
2. Security
- Enable RLS on both tables.
- Teachers can CRUD their own live_sessions.
- Students can SELECT live_sessions (to see/join rooms) and INSERT their own participation rows.
- Participants can update their own participant row (e.g. raise hand, leave).
3. Notes
- room_code is generated client-side as a random 6-char alphanumeric string.
*/

CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  room_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_live_sessions" ON live_sessions;
CREATE POLICY "select_live_sessions" ON live_sessions
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'student'
      AND (p.teacher_id = live_sessions.teacher_id OR live_sessions.teacher_id = p.teacher_id)
    )
  );

DROP POLICY IF EXISTS "insert_own_live_sessions" ON live_sessions;
CREATE POLICY "insert_own_live_sessions" ON live_sessions
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "update_own_live_sessions" ON live_sessions;
CREATE POLICY "update_own_live_sessions" ON live_sessions
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_live_sessions" ON live_sessions;
CREATE POLICY "delete_own_live_sessions" ON live_sessions
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

CREATE TABLE IF NOT EXISTS live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_hand_raised boolean DEFAULT false
);

ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_live_participants" ON live_participants;
CREATE POLICY "select_live_participants" ON live_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM live_sessions ls
      WHERE ls.id = live_participants.session_id
      AND ls.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_live_participants" ON live_participants;
CREATE POLICY "insert_own_live_participants" ON live_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_live_participants" ON live_participants;
CREATE POLICY "update_own_live_participants" ON live_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_live_participants" ON live_participants;
CREATE POLICY "delete_own_live_participants" ON live_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);
