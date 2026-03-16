-- Add owner_id and group_id to rulesets (mirror factions)
ALTER TABLE public.rulesets
  ADD COLUMN owner_id uuid REFERENCES auth.users(id),
  ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Backfill owner_id for existing rows (assign to first user if any)
UPDATE public.rulesets
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE owner_id IS NULL;

ALTER TABLE public.rulesets
  ALTER COLUMN owner_id SET NOT NULL;

-- Trigger: set owner_id on insert, protect on update (like factions)
CREATE OR REPLACE FUNCTION public.set_rulesets_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (tg_op = 'INSERT') THEN
    NEW.owner_id := auth.uid();
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSIF (tg_op = 'UPDATE') THEN
    NEW.owner_id := OLD.owner_id;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_rulesets_metadata
  BEFORE INSERT OR UPDATE ON public.rulesets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rulesets_metadata();

-- Helper: can current user access this ruleset (owner or active group member)
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
      AND (
        r.owner_id = auth.uid()
        OR (
          r.group_id IS NOT NULL
          AND public.current_user_is_active_member_of_group(r.group_id)
        )
      )
  );
$$;

-- Drop old rulesets policies
DROP POLICY IF EXISTS "Authenticated can view rulesets" ON public.rulesets;
DROP POLICY IF EXISTS "Authenticated can insert rulesets" ON public.rulesets;
DROP POLICY IF EXISTS "Authenticated can update rulesets" ON public.rulesets;
DROP POLICY IF EXISTS "Authenticated can delete rulesets" ON public.rulesets;

-- Rulesets: everyone can view; owner or group member can update/delete; authenticated can insert
CREATE POLICY "Anyone can view rulesets"
  ON public.rulesets FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated can insert rulesets"
  ON public.rulesets FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner or group member can update rulesets"
  ON public.rulesets FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND public.current_user_is_active_member_of_group(group_id)
    )
  )
  WITH CHECK (true);

CREATE POLICY "Owner or group member can delete rulesets"
  ON public.rulesets FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND public.current_user_is_active_member_of_group(group_id)
    )
  );

-- Protect rulesets auto-managed columns (like factions)
REVOKE UPDATE ON TABLE public.rulesets FROM authenticated;
GRANT UPDATE (name, group_id) ON TABLE public.rulesets TO authenticated;

-- ruleset_factions: everyone can view; insert/delete only if can access ruleset
DROP POLICY IF EXISTS "Authenticated can view ruleset_factions" ON public.ruleset_factions;
DROP POLICY IF EXISTS "Can view ruleset_factions if can access ruleset" ON public.ruleset_factions;
DROP POLICY IF EXISTS "Authenticated can insert ruleset_factions" ON public.ruleset_factions;
DROP POLICY IF EXISTS "Can insert ruleset_factions if can access ruleset" ON public.ruleset_factions;
DROP POLICY IF EXISTS "Authenticated can delete ruleset_factions" ON public.ruleset_factions;
DROP POLICY IF EXISTS "Can delete ruleset_factions if can access ruleset" ON public.ruleset_factions;

CREATE POLICY "Anyone can view ruleset_factions"
  ON public.ruleset_factions FOR SELECT TO public
  USING (true);

CREATE POLICY "Can insert ruleset_factions if can access ruleset"
  ON public.ruleset_factions FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_access_ruleset(ruleset_id));

CREATE POLICY "Can delete ruleset_factions if can access ruleset"
  ON public.ruleset_factions FOR DELETE TO authenticated
  USING (public.current_user_can_access_ruleset(ruleset_id));

-- faq_items: everyone can view; insert/update/delete only if can access ruleset
DROP POLICY IF EXISTS "Authenticated can view faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Can view faq_items if can access ruleset" ON public.faq_items;
DROP POLICY IF EXISTS "Authenticated can insert faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Can insert faq_items if can access ruleset" ON public.faq_items;
DROP POLICY IF EXISTS "Asked_by can update faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Authenticated can delete faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Asked_by can delete faq_items" ON public.faq_items;

CREATE POLICY "Anyone can view faq_items"
  ON public.faq_items FOR SELECT TO public
  USING (true);

CREATE POLICY "Can insert faq_items if can access ruleset"
  ON public.faq_items FOR INSERT TO authenticated
  WITH CHECK (
    asked_by = auth.uid()
    AND public.current_user_can_access_ruleset(ruleset_id)
  );

-- asked_by can edit question and set accepted_answer_id only
CREATE POLICY "Asked_by can update faq_items"
  ON public.faq_items FOR UPDATE TO authenticated
  USING (
    asked_by = auth.uid()
    AND public.current_user_can_access_ruleset(ruleset_id)
  )
  WITH CHECK (true);

-- asked_by can delete their faq item
CREATE POLICY "Asked_by can delete faq_items"
  ON public.faq_items FOR DELETE TO authenticated
  USING (
    asked_by = auth.uid()
    AND public.current_user_can_access_ruleset(ruleset_id)
  );

-- Protect faq_items: asked_by can only update question and accepted_answer_id (not asked_by, ruleset_id, etc.)
REVOKE UPDATE ON TABLE public.faq_items FROM authenticated;
GRANT UPDATE (question, accepted_answer_id) ON TABLE public.faq_items TO authenticated;

-- faq_answers: everyone can view; insert if can access ruleset; update/delete own answer; faq owner can delete any answer
DROP POLICY IF EXISTS "Authenticated can view faq_answers" ON public.faq_answers;
DROP POLICY IF EXISTS "Can view faq_answers if can access faq_item" ON public.faq_answers;
DROP POLICY IF EXISTS "Authenticated can insert faq_answers" ON public.faq_answers;
DROP POLICY IF EXISTS "Can insert faq_answers if can access ruleset" ON public.faq_answers;
DROP POLICY IF EXISTS "Answered_by can update own answer" ON public.faq_answers;
DROP POLICY IF EXISTS "Answered_by can delete own answer" ON public.faq_answers;
DROP POLICY IF EXISTS "Faq_item owner can delete any answer" ON public.faq_answers;

CREATE POLICY "Anyone can view faq_answers"
  ON public.faq_answers FOR SELECT TO public
  USING (true);

CREATE POLICY "Can insert faq_answers if can access ruleset"
  ON public.faq_answers FOR INSERT TO authenticated
  WITH CHECK (
    answered_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.faq_items fi
      WHERE fi.id = faq_item_id
        AND public.current_user_can_access_ruleset(fi.ruleset_id)
    )
  );

-- Answer owner can edit their answer; faq item owner cannot update answers
CREATE POLICY "Answered_by can update own answer"
  ON public.faq_answers FOR UPDATE TO authenticated
  USING (answered_by = auth.uid())
  WITH CHECK (true);

-- Answer owner OR faq item owner can delete
CREATE POLICY "Answered_by can delete own answer"
  ON public.faq_answers FOR DELETE TO authenticated
  USING (answered_by = auth.uid());

CREATE POLICY "Faq_item owner can delete any answer"
  ON public.faq_answers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faq_items fi
      WHERE fi.id = faq_item_id
        AND fi.asked_by = auth.uid()
    )
  );

-- Grants for anon (unauthenticated) to read rulesets, ruleset_factions, faq_items, faq_answers
GRANT SELECT ON public.rulesets TO anon;
GRANT SELECT ON public.ruleset_factions TO anon;
GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT ON public.faq_answers TO anon;
