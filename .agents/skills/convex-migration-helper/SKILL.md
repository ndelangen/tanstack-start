---
name: convex-migration-helper
description: Plans and executes safe Convex schema/data migrations for this repo using a widen-migrate-narrow rollout. Use when schema deploy fails, existing documents need backfills, or fields must be added/removed/reshaped without downtime.
---

# Convex Migration Helper

Use this skill for breaking Convex schema changes in this repository.

## When to Use

- Adding a required field to an existing table
- Renaming/removing fields that already exist in data
- Changing a field shape or type
- Splitting data into new tables while preserving production behavior
- Any deploy where Convex schema validation fails due to old documents

## When Not to Use

- Greenfield schema/table work with no existing rows
- Optional-field additions that do not require backfill
- Pure index changes that do not affect correctness

## Breaking Changes: The Deployment Workflow

1. **Widen:** update `convex/schema.ts` so old + new documents are valid.
2. **Dual-read/write:** update handlers so new writes use new shape while reads tolerate both shapes.
3. **Migrate existing rows:** run a bounded internal migration and backfill old rows.
4. **Verify:** add a query to detect unmigrated rows; confirm zero remaining.
5. **Narrow:** remove old shape from schema and cleanup fallback code.

## Common Migration Patterns

Use `references/migration-patterns.md` for concise examples:

- required-field rollout
- old-field removal
- type-shape transitions through a new field
- split-table extraction
- orphan cleanup
- migration completion checks

## Common Pitfalls

1. Narrowing schema before data is migrated.
2. Using unbounded `.collect()` on large tables.
3. Not handling both old/new shapes during the migration window.
4. Changing reads in one path but forgetting sibling readers/writers.
5. Forgetting to remove temporary compatibility code after narrowing.

## Repo-specific Notes

- This repo currently does **not** include `@convex-dev/migrations`.
- Prefer `internalMutation` + bounded batches (`.take(n)`) + `ctx.scheduler.runAfter` for large jobs.
- Keep validation consistent with project conventions:
  - Convex `v` for boundary shape/type.
  - Shared Zod `safeParse` for semantic rules in handlers.

## Migration Checklist

- [ ] Planned widen -> migrate -> narrow rollout
- [ ] Widened schema and deployed compatibility reads/writes
- [ ] Backfilled existing data with bounded migration batches
- [ ] Verified zero unmigrated rows remain
- [ ] Narrowed schema and removed fallback logic
- [ ] Re-ran affected tests and key mutation/query paths
