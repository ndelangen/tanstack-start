---
name: convex-setup-auth
description: Auth guidance for this repo's Convex Auth setup. Use when adding/changing sign-in providers, auth routes, or server-side authorization checks.
---

# Convex Authentication Setup

Repo scope: this project uses `@convex-dev/auth` with provider config in `convex/auth.ts`.

## When to Use

- Updating sign-in providers in `convex/auth.ts`
- Wiring/repairing auth UI and auth routes under `src/app/routes/auth/`
- Fixing authorization in Convex handlers
- Extending auth-aware profile bootstrap/update flows

## When Not to Use

- Non-Convex auth stacks
- Generic provider migrations (Clerk/Auth0/WorkOS) not used in this repo

## Source of Truth

- `docs/authentication.md`
- `docs/user-data-contract.md`
- `convex/lib/policy.ts`
- `references/convex-auth.md`
- Official docs: <https://docs.convex.dev/auth/convex-auth>

## Required Backend Pattern

- Derive auth identity server-side.
- Do not trust user identifiers from client args for authorization.
- Prefer existing helpers:
  - `getAuthUserId` from `@convex-dev/auth/server`
  - `requireAuthUserId` from `convex/lib/policy.ts`

## Repo Workflow

1. Confirm auth task scope (provider wiring, route flow, authz checks, profile bootstrap).
2. Keep provider setup in `convex/auth.ts` and auth HTTP wiring in Convex auth files.
3. Keep client provider usage aligned with root route/provider setup.
4. Enforce authorization in handlers using `requireAuthUserId` and policy helpers.
5. Validate end-to-end flow: sign in, protected mutation, sign out.

## Checklist

- [ ] Used existing Convex Auth stack (`@convex-dev/auth`)
- [ ] Kept provider/auth config in Convex auth files
- [ ] Enforced server-side auth checks in protected handlers
- [ ] Avoided client-provided user identifiers for authz
- [ ] Verified login/logout and protected actions work
