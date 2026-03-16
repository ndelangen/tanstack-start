-- Rulesets, ruleset_factions (junction), faq_items
-- RLS on all tables. Trigger: remove faction from ruleset_factions when soft-deleted.

CREATE TABLE public.rulesets (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ruleset_factions (
  ruleset_id integer NOT NULL REFERENCES public.rulesets(id) ON DELETE CASCADE,
  faction_id uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
  PRIMARY KEY (ruleset_id, faction_id)
);

CREATE TABLE public.faq_items (
  id serial PRIMARY KEY,
  ruleset_id integer NOT NULL REFERENCES public.rulesets(id) ON DELETE CASCADE,
  question text NOT NULL,
  asked_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Each user can add exactly 1 answer per FAQ item. Many answers per FAQ.
CREATE TABLE public.faq_answers (
  id serial PRIMARY KEY,
  faq_item_id integer NOT NULL REFERENCES public.faq_items(id) ON DELETE CASCADE,
  answer text NOT NULL,
  answered_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faq_item_id, answered_by)
);

-- asked_by can designate which answer is accepted (change accepted_answer_id)
ALTER TABLE public.faq_items
  ADD COLUMN accepted_answer_id integer REFERENCES public.faq_answers(id) ON DELETE SET NULL;

-- Trigger: when faction is soft-deleted, remove from ruleset_factions
CREATE OR REPLACE FUNCTION public.cleanup_ruleset_factions_on_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    DELETE FROM public.ruleset_factions WHERE faction_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_ruleset_factions
  AFTER UPDATE ON public.factions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_ruleset_factions_on_soft_delete();

-- RLS
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruleset_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_answers ENABLE ROW LEVEL SECURITY;

-- rulesets policies
CREATE POLICY "Authenticated can view rulesets"
  ON public.rulesets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert rulesets"
  ON public.rulesets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update rulesets"
  ON public.rulesets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete rulesets"
  ON public.rulesets FOR DELETE TO authenticated USING (true);

-- ruleset_factions policies
CREATE POLICY "Authenticated can view ruleset_factions"
  ON public.ruleset_factions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert ruleset_factions"
  ON public.ruleset_factions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete ruleset_factions"
  ON public.ruleset_factions FOR DELETE TO authenticated USING (true);

-- faq_items policies
CREATE POLICY "Authenticated can view faq_items"
  ON public.faq_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert faq_items"
  ON public.faq_items FOR INSERT TO authenticated
  WITH CHECK (asked_by = auth.uid());

-- asked_by can update (e.g. change accepted_answer_id)
CREATE POLICY "Asked_by can update faq_items"
  ON public.faq_items FOR UPDATE TO authenticated
  USING (asked_by = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete faq_items"
  ON public.faq_items FOR DELETE TO authenticated
  USING (asked_by = auth.uid());

-- faq_answers policies
CREATE POLICY "Authenticated can view faq_answers"
  ON public.faq_answers FOR SELECT TO authenticated USING (true);

-- Any authenticated user can add their 1 answer (unique faq_item_id, answered_by)
CREATE POLICY "Authenticated can insert faq_answers"
  ON public.faq_answers FOR INSERT TO authenticated
  WITH CHECK (answered_by = auth.uid());

CREATE POLICY "Answered_by can update own answer"
  ON public.faq_answers FOR UPDATE TO authenticated
  USING (answered_by = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Answered_by can delete own answer"
  ON public.faq_answers FOR DELETE TO authenticated
  USING (answered_by = auth.uid());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rulesets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rulesets_id_seq TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.ruleset_factions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.faq_items_id_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_answers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.faq_answers_id_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rulesets TO service_role;
GRANT SELECT, INSERT, DELETE ON public.ruleset_factions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_answers TO service_role;
