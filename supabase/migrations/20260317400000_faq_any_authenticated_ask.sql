-- Allow any authenticated user to ask a question on any ruleset
DROP POLICY IF EXISTS "Can insert faq_items if can access ruleset" ON public.faq_items;

CREATE POLICY "Authenticated can insert faq_items"
  ON public.faq_items FOR INSERT TO authenticated
  WITH CHECK (asked_by = auth.uid());
