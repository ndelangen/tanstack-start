-- Only the owner can change group_id on rulesets and factions.
-- Non-owners attempting to change it have the change silently reverted.

CREATE OR REPLACE FUNCTION public.protect_ruleset_group_id_owner_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != OLD.owner_id AND (NEW.group_id IS DISTINCT FROM OLD.group_id) THEN
    NEW.group_id := OLD.group_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_ruleset_group_id
  BEFORE UPDATE ON public.rulesets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ruleset_group_id_owner_only();

CREATE OR REPLACE FUNCTION public.protect_faction_group_id_owner_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != OLD.owner_id AND (NEW.group_id IS DISTINCT FROM OLD.group_id) THEN
    NEW.group_id := OLD.group_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_faction_group_id
  BEFORE UPDATE ON public.factions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_faction_group_id_owner_only();
