-- Fix set_group_members_approval trigger to handle INSERT correctly
-- On INSERT, requested_at should use the default value (now()), not be set to NULL
CREATE OR REPLACE FUNCTION public.set_group_members_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Only allow approved_by/approved_at to be set when status = 'active'
  if new.status = 'active' then
    new.approved_by := auth.uid();   -- the approver
    new.approved_at := now();
  else
    new.approved_by := null;
    new.approved_at := null;
  end if;

  -- Prevent user from changing their own approved_by or approved_at
  if tg_op = 'UPDATE' and old.approved_by is not null then
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;

  -- Users cannot modify requested_at (only on UPDATE, not INSERT)
  if tg_op = 'UPDATE' then
    new.requested_at := old.requested_at;
  end if;

  return new;
end;
$function$
;
