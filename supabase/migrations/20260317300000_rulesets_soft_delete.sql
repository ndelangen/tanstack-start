-- Soft-delete rulesets (like factions)
ALTER TABLE public.rulesets
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- Allow reusing name after soft-delete
ALTER TABLE public.rulesets DROP CONSTRAINT IF EXISTS rulesets_name_key;
CREATE UNIQUE INDEX rulesets_name_not_deleted_key
  ON public.rulesets (name) WHERE (NOT is_deleted);

-- Update RLS: hide soft-deleted rulesets from SELECT
DROP POLICY IF EXISTS "Anyone can view rulesets" ON public.rulesets;
CREATE POLICY "Anyone can view rulesets"
  ON public.rulesets FOR SELECT TO public
  USING (NOT is_deleted);

-- Allow updating is_deleted
REVOKE UPDATE ON TABLE public.rulesets FROM authenticated;
GRANT UPDATE (name, group_id, is_deleted) ON TABLE public.rulesets TO authenticated;

-- Helper: exclude soft-deleted from access check
CREATE OR REPLACE FUNCTION public.current_user_can_access_ruleset(rid integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rulesets r
    WHERE r.id = rid
      AND NOT r.is_deleted
      AND (
        r.owner_id = auth.uid()
        OR (
          r.group_id IS NOT NULL
          AND public.current_user_is_active_member_of_group(r.group_id)
        )
      )
  );
$$;

-- When ruleset is soft-deleted, remove children (like CASCADE but we keep the ruleset row)
CREATE OR REPLACE FUNCTION public.cleanup_ruleset_children_on_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    DELETE FROM public.ruleset_factions WHERE ruleset_id = NEW.id;
    DELETE FROM public.faq_items WHERE ruleset_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_ruleset_children
  AFTER UPDATE ON public.rulesets
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_ruleset_children_on_soft_delete();
