# Convex Migrations Runbook

Required process for all **breaking** Convex schema/data migrations in this repo.

## When this runbook is required

Use this process when:

- adding a required field to an existing table
- changing field type/shape
- renaming/removing a field that already exists in data
- moving data between tables

If a change can invalidate existing production documents, this runbook is required.

## Required rollout: widen -> migrate -> verify -> narrow

1. **Widen**
   - Update schema so both old and new document shapes are valid.
   - Deploy schema + compatibility code first.

2. **Compatibility window**
   - Writes emit the new shape.
   - Reads tolerate old and new shapes.
   - Do not narrow schema during this window.

3. **Migrate**
   - Run bounded backfill job in production.
   - Migration must be idempotent and safe to re-run.
   - For large tables, use paginated or batched jobs with continuation scheduling.

4. **Verify**
   - Run a verification query/check until remaining unmigrated rows are zero.
   - Save evidence in PR/deploy notes before narrowing.

5. **Narrow**
   - Make schema strict (remove optional/legacy shape).
   - Remove compatibility fallback logic and temporary migration entrypoints.

## Production policy

- Migration code is committed and deployed with app code.
- Migration execution is **automatic** in production deploy workflow.
- Prefer internal/admin-only migration entrypoints.
- A narrowing deploy is blocked until verify reports zero remaining rows.

## Guard manifest contract

Source of truth: `convex/migration-guards.json`

```json
{
  "entries": [
    { "id": "groups_slug_v1", "phase": "widen", "requires": [] },
    { "id": "groups_slug_narrow", "phase": "narrow", "requires": ["groups_slug_v1"] }
  ]
}
```

Rules:

- `id`: unique migration or narrow guard identifier.
- `phase`:
  - `widen`: migration IDs auto-started in deploy.
  - `narrow`: schema narrowing checkpoints that list required completed migration IDs.
- `requires`: migration IDs that must be `success + isDone=true` before narrow is allowed.

For current slug demos:

- `groups_slug_v1`
- `rulesets_slug_v1`

## Automated production flow (fail-closed)

1. Deploy widen + compatibility code (`bun run convex:deploy`).
2. Deploy workflow runs `bun run migrations:deploy`:
   - starts required widen migrations
   - polls `migrations:assertReadyForNarrow`
   - syncs status snapshot to `migration_runs`
3. Deploy fails if migration status is failed/incomplete/timeout.
4. Narrow PR can merge only if PR guard can pass `bun run migrations:narrow-check`.

## PR and release checklist (required for breaking migrations)

- [ ] Widen phase implemented and deployed first
- [ ] Compatibility reads/writes present during migration window
- [ ] Backfill job is bounded and idempotent
- [ ] Verify function/check exists and shows completion evidence
- [ ] Narrow phase is separate and only after verify completion
- [ ] Temporary migration/fallback cleanup planned

## Commands

```bash
# Deploy widen / narrow phases
npm run convex:deploy

# Start or resume required migrations defined by manifest and poll until complete
bun run scripts/migration-guards.ts deploy 2700000 5000 --prod

# Check narrow prerequisites only
bun run scripts/migration-guards.ts narrow-check --prod

# Raw status (optional)
npx convex run migrations:getStatus '{"ids":["groups_slug_v1","rulesets_slug_v1"]}' --prod
```

## Templates and references

- Convex template scaffold: [`convex/migrationsTemplate.ts`](../convex/migrationsTemplate.ts)
- Team migration skill: [`.agents/skills/convex-migration-helper/SKILL.md`](../.agents/skills/convex-migration-helper/SKILL.md)
