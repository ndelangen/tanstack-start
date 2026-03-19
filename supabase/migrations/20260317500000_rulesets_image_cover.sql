-- Add image_cover to rulesets (optional square cover image URL)
ALTER TABLE public.rulesets
  ADD COLUMN image_cover text;

-- Extend UPDATE grant to include image_cover
REVOKE UPDATE ON TABLE public.rulesets FROM authenticated;
GRANT UPDATE (name, group_id, image_cover) ON TABLE public.rulesets TO authenticated;
