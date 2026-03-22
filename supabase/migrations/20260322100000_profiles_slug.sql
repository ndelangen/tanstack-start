-- Public profile URL segment: derived from username (lowercase alphanumerics) + numeric suffix for uniqueness.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.profiles_assign_slug_from_username()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  base text;
  candidate text;
  n int := 1;
  name_val text;
BEGIN
  -- Only recompute when username changes, or slug missing (backfill), or insert
  IF TG_OP = 'UPDATE'
     AND NEW.username IS NOT DISTINCT FROM OLD.username
     AND OLD.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  name_val := trim(COALESCE(NEW.username, ''));
  IF name_val = '' THEN
    name_val := 'user';
  END IF;

  base := lower(regexp_replace(name_val, '[^a-zA-Z0-9]+', '', 'g'));
  IF base = '' OR base IS NULL THEN
    base := 'user';
  END IF;

  -- Avoid collisions with future static routes under /profiles/...
  IF base IN ('settings', 'edit', 'new', 'login', 'auth', 'profiles') THEN
    base := 'user';
  END IF;

  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.slug = candidate
        AND (TG_OP = 'INSERT' OR p.id IS DISTINCT FROM NEW.id)
    );
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_assign_slug_from_username ON public.profiles;

CREATE TRIGGER trg_profiles_assign_slug_from_username
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_assign_slug_from_username();

-- Backfill existing rows
UPDATE public.profiles SET username = username WHERE slug IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key
  ON public.profiles (slug);
