# User Data Contract

## Purpose

Define which user-related fields belong to Convex Auth tables vs app-level profile tables.

## Source of Truth by Table

- `users` (from `authTables`)
  - Auth-owned identity record.
  - Provider-sourced identity defaults (`name`, `image`, `email`, phone fields).
  - Primary key is Convex `Id<"users">` (stored as string in app-facing records).
- `authAccounts` (from `authTables`)
  - Provider linkage metadata (`provider`, `providerAccountId`, secrets/verification fields).
  - Internal to authentication and account-linking.
- `profiles` (app-owned)
  - Public/app-facing user profile model.
  - Editable fields and URL semantics:
    - `username`
    - `avatar_url`
    - `slug`
    - `created_at`, `updated_at`
  - One profile per auth user (`profiles.id` maps to auth user id string).

## Why `profiles` Exists

- We need app-owned read/write semantics independent from auth internals.
- We need a stable, unique public slug with deterministic regeneration rules.
- We need explicit public-facing profile queries (`by_slug`) and update policies.
- We avoid coupling product behavior to provider data shape changes.

## Mutation Rules

- Authentication/authorization is enforced with `getAuthUserId()` and `requireAuthUserId()`.
- `createProfileIfMissing` bootstraps and backfills profile data from auth user data.
- If profile is incomplete (`slug === "user"` or missing username/avatar), bootstrap backfills:
  - `username` from identity/auth user
  - `avatar_url` from identity/auth user image
  - `slug` from username via `slugify`, uniqueness checked on `profiles.by_slug`
- `updateCurrent` lets users edit `username` and `avatar_url`; username changes recompute slug.

## Query Rules

- UI and app domain hooks should read profile data from `profiles`, not directly from `users`.
- Auth tables are treated as internal auth state except where bootstrap/backfill requires them.

## Do / Do Not

- Do add new public profile fields to `profiles`.
- Do keep slug constraints and generation logic in `profiles` mutations.
- Do not use `authAccounts` for user-facing profile reads.
- Do not expose or mutate auth-internal provider linkage as profile data.
