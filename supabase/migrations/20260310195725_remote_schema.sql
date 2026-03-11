drop extension if exists "pg_net";


  create table "public"."factions" (
    "id" uuid not null default gen_random_uuid(),
    "owner" uuid not null,
    "data" jsonb not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_deleted" boolean not null default false,
    "group_id" uuid
      );


alter table "public"."factions" enable row level security;


  create table "public"."group_members" (
    "user_id" uuid not null,
    "group_id" uuid not null,
    "status" text not null,
    "requested_at" timestamp with time zone not null default now(),
    "approved_at" timestamp with time zone,
    "approved_by" uuid
      );


alter table "public"."group_members" enable row level security;


  create table "public"."groups" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null
      );


alter table "public"."groups" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "avatar_url" text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp with time zone
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX factions_pkey ON public.factions USING btree (id);

CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (user_id, group_id);

CREATE UNIQUE INDEX groups_name_key ON public.groups USING btree (name);

CREATE UNIQUE INDEX groups_pkey ON public.groups USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."factions" add constraint "factions_pkey" PRIMARY KEY using index "factions_pkey";

alter table "public"."group_members" add constraint "group_members_pkey" PRIMARY KEY using index "group_members_pkey";

alter table "public"."groups" add constraint "groups_pkey" PRIMARY KEY using index "groups_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."factions" add constraint "factions_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) not valid;

alter table "public"."factions" validate constraint "factions_group_id_fkey";

alter table "public"."factions" add constraint "factions_owner_fkey" FOREIGN KEY (owner) REFERENCES auth.users(id) not valid;

alter table "public"."factions" validate constraint "factions_owner_fkey";

alter table "public"."group_members" add constraint "group_members_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."group_members" validate constraint "group_members_approved_by_fkey";

alter table "public"."group_members" add constraint "group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) not valid;

alter table "public"."group_members" validate constraint "group_members_group_id_fkey";

alter table "public"."group_members" add constraint "group_members_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'removed'::text]))) not valid;

alter table "public"."group_members" validate constraint "group_members_status_check";

alter table "public"."group_members" add constraint "group_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."group_members" validate constraint "group_members_user_id_fkey";

alter table "public"."groups" add constraint "groups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."groups" validate constraint "groups_created_by_fkey";

alter table "public"."groups" add constraint "groups_name_key" UNIQUE using index "groups_name_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

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

  -- Users cannot modify requested_at
  new.requested_at := old.requested_at;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (tg_op = 'INSERT') then
    new.owner := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.owner := old.owner; -- prevent owner change
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."factions" to "anon";

grant insert on table "public"."factions" to "anon";

grant references on table "public"."factions" to "anon";

grant select on table "public"."factions" to "anon";

grant trigger on table "public"."factions" to "anon";

grant truncate on table "public"."factions" to "anon";

grant update on table "public"."factions" to "anon";

grant delete on table "public"."factions" to "authenticated";

grant insert on table "public"."factions" to "authenticated";

grant references on table "public"."factions" to "authenticated";

grant select on table "public"."factions" to "authenticated";

grant trigger on table "public"."factions" to "authenticated";

grant truncate on table "public"."factions" to "authenticated";

grant update on table "public"."factions" to "authenticated";

grant delete on table "public"."factions" to "service_role";

grant insert on table "public"."factions" to "service_role";

grant references on table "public"."factions" to "service_role";

grant select on table "public"."factions" to "service_role";

grant trigger on table "public"."factions" to "service_role";

grant truncate on table "public"."factions" to "service_role";

grant update on table "public"."factions" to "service_role";

grant delete on table "public"."group_members" to "anon";

grant insert on table "public"."group_members" to "anon";

grant references on table "public"."group_members" to "anon";

grant select on table "public"."group_members" to "anon";

grant trigger on table "public"."group_members" to "anon";

grant truncate on table "public"."group_members" to "anon";

grant update on table "public"."group_members" to "anon";

grant delete on table "public"."group_members" to "authenticated";

grant insert on table "public"."group_members" to "authenticated";

grant references on table "public"."group_members" to "authenticated";

grant select on table "public"."group_members" to "authenticated";

grant trigger on table "public"."group_members" to "authenticated";

grant truncate on table "public"."group_members" to "authenticated";

grant update on table "public"."group_members" to "authenticated";

grant delete on table "public"."group_members" to "service_role";

grant insert on table "public"."group_members" to "service_role";

grant references on table "public"."group_members" to "service_role";

grant select on table "public"."group_members" to "service_role";

grant trigger on table "public"."group_members" to "service_role";

grant truncate on table "public"."group_members" to "service_role";

grant update on table "public"."group_members" to "service_role";

grant delete on table "public"."groups" to "anon";

grant insert on table "public"."groups" to "anon";

grant references on table "public"."groups" to "anon";

grant select on table "public"."groups" to "anon";

grant trigger on table "public"."groups" to "anon";

grant truncate on table "public"."groups" to "anon";

grant update on table "public"."groups" to "anon";

grant delete on table "public"."groups" to "authenticated";

grant insert on table "public"."groups" to "authenticated";

grant references on table "public"."groups" to "authenticated";

grant select on table "public"."groups" to "authenticated";

grant trigger on table "public"."groups" to "authenticated";

grant truncate on table "public"."groups" to "authenticated";

grant update on table "public"."groups" to "authenticated";

grant delete on table "public"."groups" to "service_role";

grant insert on table "public"."groups" to "service_role";

grant references on table "public"."groups" to "service_role";

grant select on table "public"."groups" to "service_role";

grant trigger on table "public"."groups" to "service_role";

grant truncate on table "public"."groups" to "service_role";

grant update on table "public"."groups" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "Anyone can view factions"
  on "public"."factions"
  as permissive
  for select
  to public
using ((NOT is_deleted));



  create policy "Group members can update membership status"
  on "public"."group_members"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.status = 'active'::text)))))
with check ((status = ANY (ARRAY['active'::text, 'removed'::text, 'pending'::text])));



  create policy "No one can delete memberships"
  on "public"."group_members"
  as permissive
  for delete
  to public
using (false);



  create policy "Users and group members can view memberships"
  on "public"."group_members"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.status = 'active'::text))))));



  create policy "Users can request membership"
  on "public"."group_members"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (status = 'pending'::text)));



  create policy "Enable insert for authenticated users only"
  on "public"."groups"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Groups are visible to authenticated users"
  on "public"."groups"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Profiles are publicly readable"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


CREATE TRIGGER set_factions_metadata BEFORE INSERT OR UPDATE ON public.factions FOR EACH ROW EXECUTE FUNCTION public.set_metadata();

CREATE TRIGGER trg_group_members_approval BEFORE INSERT OR UPDATE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.set_group_members_approval();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


