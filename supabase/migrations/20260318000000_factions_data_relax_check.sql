-- Full faction documents are validated in the app (Zod: FactionInputSchema).
-- Keeping jsonb_matches_schema in sync with generated asset enums is impractical.

ALTER TABLE public.factions
  DROP CONSTRAINT IF EXISTS factions_data_schema_check;

ALTER TABLE public.factions
  ADD CONSTRAINT factions_data_is_object_check
  CHECK (jsonb_typeof(data) = 'object');
