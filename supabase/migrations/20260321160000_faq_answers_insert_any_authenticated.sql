-- FAQ items are insertable by any authenticated user (20260317400000) and readable by everyone.
-- Answers were still gated on current_user_can_access_ruleset (owner/group only), which blocked
-- answering others' questions on rulesets you don't "own". Allow any authenticated user to add
-- their single answer per question (enforced by UNIQUE (faq_item_id, answered_by)).

DROP POLICY IF EXISTS "Can insert faq_answers if can access ruleset" ON public.faq_answers;

CREATE POLICY "Authenticated can insert faq_answers if faq item exists"
  ON public.faq_answers FOR INSERT TO authenticated
  WITH CHECK (
    answered_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.faq_items fi
      INNER JOIN public.rulesets r ON r.id = fi.ruleset_id
      WHERE fi.id = faq_item_id
        AND NOT r.is_deleted
    )
  );
