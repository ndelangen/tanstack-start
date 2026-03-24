# Convex Auth (Repo Reference)

Official docs:
- <https://docs.convex.dev/auth/convex-auth>
- <https://docs.convex.dev/auth/functions-auth>

Use this reference for repo-specific auth wiring, not generic provider catalogs.

## Current Repo Shape

- Provider configuration lives in `convex/auth.ts`.
- Client auth provider is wired in root app composition.
- Authorization helpers live in `convex/lib/policy.ts`.
- Profile bootstrap/update behavior lives in profile-related Convex handlers.

## Required Rules

1. Derive identity server-side using Convex auth APIs.
2. Do not accept client-provided user IDs for authorization.
3. Reuse `requireAuthUserId` for protected handlers.
4. Keep user-facing profile data in `profiles` patterns described in `docs/user-data-contract.md`.

## Validation Steps

- Sign in using configured provider.
- Run one protected mutation and one protected query.
- Confirm unauthenticated access fails with clear errors.
- Sign out and confirm protected operations are blocked.
