-- Convert group_members.status from CHECK constraint to PostgreSQL ENUM
-- This allows Supabase to automatically generate TypeScript types from the enum

-- Create the ENUM type
CREATE TYPE group_member_status AS ENUM ('pending', 'active', 'removed');

-- Drop the old CHECK constraint FIRST (before altering column type)
-- This prevents PostgreSQL from trying to validate the constraint during type conversion
ALTER TABLE "public"."group_members" 
  DROP CONSTRAINT IF EXISTS group_members_status_check;

-- Drop trigger that depends on the status column
-- We'll recreate it after altering the column type
DROP TRIGGER IF EXISTS trg_group_members_approval ON "public"."group_members";

-- Drop policies that depend on the status column
-- We'll recreate them after altering the column type
DROP POLICY IF EXISTS "Group members can update membership status" ON "public"."group_members";
DROP POLICY IF EXISTS "Users and group members can view memberships" ON "public"."group_members";
DROP POLICY IF EXISTS "Users can request membership" ON "public"."group_members";

-- Convert the column to use the ENUM type
-- The USING clause converts existing text values to enum values
-- Cast the text column to the enum type explicitly
ALTER TABLE "public"."group_members" 
  ALTER COLUMN status TYPE group_member_status 
  USING CAST(status AS group_member_status);

-- Recreate the policies (they work with ENUMs - PostgreSQL auto-casts string literals)
CREATE POLICY "Group members can update membership status"
  ON "public"."group_members"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
USING ((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.status = 'active'::group_member_status)))))
WITH CHECK ((status = ANY (ARRAY['active'::group_member_status, 'removed'::group_member_status, 'pending'::group_member_status])));

CREATE POLICY "Users and group members can view memberships"
  ON "public"."group_members"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.status = 'active'::group_member_status))))));

CREATE POLICY "Users can request membership"
  ON "public"."group_members"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
WITH CHECK (((user_id = auth.uid()) AND (status = 'pending'::group_member_status)));

-- Recreate the trigger (the function works with ENUMs - PostgreSQL auto-casts string literals)
CREATE TRIGGER trg_group_members_approval 
  BEFORE INSERT OR UPDATE ON public.group_members 
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_group_members_approval();
