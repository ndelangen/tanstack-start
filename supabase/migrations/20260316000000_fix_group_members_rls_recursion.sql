-- Fix infinite recursion in group_members RLS policies.
-- The policies used EXISTS (SELECT ... FROM group_members) which re-triggers
-- the same policy, causing recursion. Use a SECURITY DEFINER function that
-- bypasses RLS to break the cycle.

-- Function runs as owner (bypasses RLS) so it can check membership without recursion
CREATE OR REPLACE FUNCTION public.current_user_is_active_member_of_group(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid() AND status = 'active'
  );
$$;

-- Drop and recreate SELECT policy (was: Users and group members can view memberships)
DROP POLICY IF EXISTS "Users and group members can view memberships" ON "public"."group_members";

CREATE POLICY "Users and group members can view memberships"
  ON "public"."group_members"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR current_user_is_active_member_of_group(group_id)
  );

-- Drop and recreate UPDATE policy (was: Group members can update membership status)
DROP POLICY IF EXISTS "Group members can update membership status" ON "public"."group_members";

CREATE POLICY "Group members can update membership status"
  ON "public"."group_members"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (current_user_is_active_member_of_group(group_id))
  WITH CHECK (
    status = ANY (ARRAY['active'::group_member_status, 'removed'::group_member_status, 'pending'::group_member_status])
  );
