-- Auto-set factions.data->>'id' from data->>'name' with numeric suffix for uniqueness among live rows.

CREATE OR REPLACE FUNCTION public.factions_assign_data_id_from_name()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  base text;
  candidate text;
  n int := 1;
  name_val text;
BEGIN
  name_val := trim(NEW.data->>'name');
  IF name_val IS NULL OR name_val = '' THEN
    name_val := 'faction';
  END IF;

  base := lower(regexp_replace(name_val, '[^a-zA-Z0-9]+', '', 'g'));
  IF base = '' OR base IS NULL THEN
    base := 'faction';
  END IF;

  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.factions f
      WHERE f.data->>'id' = candidate
        AND f.is_deleted = false
        AND (TG_OP = 'INSERT' OR f.id IS DISTINCT FROM NEW.id)
    );
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  NEW.data := jsonb_set(COALESCE(NEW.data, '{}'::jsonb), '{id}', to_jsonb(candidate), true);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_factions_assign_data_id_from_name ON public.factions;

CREATE TRIGGER trg_factions_assign_data_id_from_name
  BEFORE INSERT OR UPDATE ON public.factions
  FOR EACH ROW
  EXECUTE FUNCTION public.factions_assign_data_id_from_name();

CREATE UNIQUE INDEX IF NOT EXISTS factions_data_id_unique_live
  ON public.factions ((data->>'id'))
  WHERE is_deleted = false;
