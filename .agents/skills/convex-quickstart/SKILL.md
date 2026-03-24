---
name: convex-quickstart
description: Quickstart for brand-new Convex setup only. In this repo, prefer existing Convex/TanStack Start patterns instead of scaffold guidance.
---

# Convex Quickstart

This repository already has Convex configured. Use this skill only when a task explicitly asks for fresh bootstrap/setup.

## When to Use

- Starting a brand-new app with no `convex/` directory
- Adding Convex to a project that has never used it

## When Not to Use

- Working inside this repo's existing Convex setup
- Implementing features in existing domains (`src/app/<domain>/db.ts`, `convex/*.ts`)
- Adding/changing auth only (use `convex-setup-auth`)

## Repo Fast Path

For this codebase:

1. Read `docs/README.md` and `docs/data-layer.md`.
2. Use `src/app/db/core/index.ts` and existing domain `db.ts` modules.
3. Respect TanStack Start prerender handling (`isTanStackStartPrerendering`).
4. Keep validation split:
   - Convex `v` validators at function boundary
   - shared Zod `safeParse` for semantic/business rules in handlers

## If User Truly Wants Bootstrap

- Follow official quickstart: <https://docs.convex.dev/quickstart>
- Then return to this repo's conventions.
