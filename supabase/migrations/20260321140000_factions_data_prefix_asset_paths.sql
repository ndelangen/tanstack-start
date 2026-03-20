-- Prefix repo-relative asset strings in factions.data with '/' (vector/, image/, generated/).
-- Idempotent: values that already start with '/' are unchanged.
--
-- Release: apply this migration in the same release as shipping Zod enums / generated.ts paths
-- that require a leading slash; otherwise clients may fail to parse existing rows until this runs.

CREATE OR REPLACE FUNCTION public.faction_data_prefix_asset_paths(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  ty text;
  s text;
  new_obj jsonb;
  r record;
  acc jsonb;
  i int;
  arr_len int;
BEGIN
  IF j IS NULL THEN
    RETURN NULL;
  END IF;

  ty := jsonb_typeof(j);

  IF ty = 'string' THEN
    s := j #>> '{}';
    IF s IS NULL OR left(s, 1) = '/' THEN
      RETURN j;
    END IF;
    IF s ~* '^https?://' THEN
      RETURN j;
    END IF;
    IF s ~ '^#[0-9a-fA-F]{6}$' THEN
      RETURN j;
    END IF;
    IF s ~ '^(vector|image|generated)/' THEN
      RETURN to_jsonb('/' || s);
    END IF;
    RETURN j;

  ELSIF ty = 'array' THEN
    arr_len := jsonb_array_length(j);
    IF arr_len IS NULL THEN
      RETURN j;
    END IF;
    acc := '[]'::jsonb;
    FOR i IN 0 .. arr_len - 1 LOOP
      acc := acc || jsonb_build_array(public.faction_data_prefix_asset_paths(j -> i));
    END LOOP;
    RETURN acc;

  ELSIF ty = 'object' THEN
    new_obj := '{}'::jsonb;
    FOR r IN SELECT * FROM jsonb_each(j)
    LOOP
      new_obj := new_obj || jsonb_build_object(r.key, public.faction_data_prefix_asset_paths(r.value));
    END LOOP;
    RETURN new_obj;

  ELSE
    RETURN j;
  END IF;
END;
$function$;

UPDATE public.factions
SET data = public.faction_data_prefix_asset_paths(data)
WHERE data IS NOT NULL;
