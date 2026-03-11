-- Protect auto-managed fields from being updated by authenticated users
-- This ensures that fields managed by triggers or defaults cannot be directly modified

-- Factions table: protect id, owner_id, created_at, updated_at
-- Allow updates only on: data, group_id, is_deleted
REVOKE UPDATE ON TABLE "public"."factions" FROM "authenticated";
GRANT UPDATE (data, group_id, is_deleted) ON TABLE "public"."factions" TO "authenticated";

-- Groups table: protect id, created_at, created_by
-- Allow updates only on: name
REVOKE UPDATE ON TABLE "public"."groups" FROM "authenticated";
GRANT UPDATE (name) ON TABLE "public"."groups" TO "authenticated";

-- Group members table: protect requested_at, approved_at, approved_by
-- Allow updates only on: status, user_id, group_id
REVOKE UPDATE ON TABLE "public"."group_members" FROM "authenticated";
GRANT UPDATE (status, user_id, group_id) ON TABLE "public"."group_members" TO "authenticated";
