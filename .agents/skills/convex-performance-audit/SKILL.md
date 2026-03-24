---
name: convex-performance-audit
description: Performance audit guidance for this repo's Convex + TanStack Query/Start stack (hot reads, OCC conflicts, subscription cost, function limits).
---

# Convex Performance Audit

Use this skill when a feature is slow, expensive, or conflict-prone.

## When to Use

- `npx convex insights --details` shows high bytes/docs read or OCC conflicts
- UI updates feel slow from reactive overfetching
- Convex functions approach execution/transaction limits
- Similar performance issues appear across sibling functions

## Routing to References

- Read amplification / indexes / JS filtering: `references/hot-path-rules.md`
- OCC conflicts / write contention: `references/occ-conflicts.md`
- Subscription cost / reactivity scope: `references/subscription-cost.md`
- Function budget / payload size: `references/function-budget.md`

## Repo-Specific Trace Order

1. Pick one real user flow and route entrypoint.
2. Trace frontend callsites using:
   - domain hooks in `src/app/<domain>/db.ts`
   - `useLiveQuery` wrappers
   - query loader prefetch/ensure patterns in routes
3. Trace Convex read/write paths in `convex/*.ts`:
   - `ctx.db.query/get`
   - `ctx.db.insert/patch/replace/delete`
4. Check sibling functions touching the same tables.
5. Apply smallest fix first; escalate only with evidence.

## Guardrails

- Do not propose large schema/migration work without measured signal.
- Avoid generic rewrites disconnected from this repo's data flows.
- Keep behavior unchanged while reducing reads/writes/invalidation.

## Checklist

- [ ] Gathered runtime/code signals
- [ ] Chose reference by problem class
- [ ] Traced end-to-end read/write path
- [ ] Audited sibling readers/writers
- [ ] Applied minimal effective fix
- [ ] Verified behavior parity and reduced cost
