-- Rename owner column to owner_id in factions table
ALTER TABLE public.factions RENAME COLUMN owner TO owner_id;

-- Drop the old foreign key constraint
ALTER TABLE public.factions DROP CONSTRAINT IF EXISTS factions_owner_fkey;

-- Recreate the foreign key with the new column name
ALTER TABLE public.factions ADD CONSTRAINT factions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) NOT VALID;
ALTER TABLE public.factions VALIDATE CONSTRAINT factions_owner_id_fkey;

-- Update the set_metadata() trigger function to use owner_id
CREATE OR REPLACE FUNCTION public.set_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (tg_op = 'INSERT') then
    new.owner_id := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.owner_id := old.owner_id; -- prevent owner change
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;

  return new;
end;
$function$
;
