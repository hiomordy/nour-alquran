/*
# Fix infinite recursion in profiles_select policy

## Problem
The previous profiles_select policy had a subquery on `profiles` itself:
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.teacher_id = profiles.id)
This causes infinite recursion because the SELECT policy on `profiles` is evaluated
while querying `profiles`, which triggers the policy again, ad infinitum.

## Solution
Use a SECURITY DEFINER function to look up the current user's teacher_id
without going through RLS. This breaks the recursion.
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Create a helper function that returns the current user's teacher_id
-- SECURITY DEFINER + no RLS bypass to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_teacher_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT teacher_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Re-create the policy using the function instead of a subquery on profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR teacher_id = auth.uid()
    OR id = public.get_current_teacher_id()
  );
