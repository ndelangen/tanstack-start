-- Factions had RLS enabled with SELECT-only policy; INSERT/UPDATE were denied for everyone.
-- Authenticated users may insert rows they own and update their own rows (data, group_id, is_deleted per column grants).

CREATE POLICY "Authenticated users can insert own factions"
  ON public.factions
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own factions"
  ON public.factions
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
