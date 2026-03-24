# Migration Patterns Reference

Repo-focused Convex migration patterns using widen -> migrate -> narrow.

## Adding a Required Field

```typescript
// Deploy 1: schema accepts old + new
users: defineTable({
  name: v.string(),
  role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
})

// Backfill (bounded batches)
export const backfillRole = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("users")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });
    for (const user of page.page) {
      if (user.role === undefined) {
        await ctx.db.patch(user._id, { role: "user" });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillRole, {
        cursor: page.continueCursor,
      });
    }
    return null;
  }
});

// Deploy 2: make field required
users: defineTable({
  name: v.string(),
  role: v.union(v.literal("user"), v.literal("admin")),
})
```

## Deleting a Field

Make it optional, clear it from rows, then remove from schema.

```typescript
// Deploy 1: make optional
// isPro: v.boolean()  -->  isPro: v.optional(v.boolean())

export const clearDeprecatedField = internalMutation({
  handler: async (ctx) => {
    const docs = await ctx.db.query("teams").take(200);
    for (const team of docs) {
      if (team.isPro !== undefined) {
        await ctx.db.patch(team._id, { isPro: undefined });
      }
    }
    return null;
  }
});

// Deploy 2: remove isPro from schema
```

## Changing a Field Type

Prefer creating a new field, then migrate old values.

```typescript
// Deploy 1
// isPro: v.boolean()  -->  isPro: v.optional(v.boolean()), plan: v.optional(...)

export const migratePlan = internalMutation({
  handler: async (ctx) => {
    const docs = await ctx.db.query("teams").take(200);
    for (const team of docs) {
    if (team.plan === undefined) {
      await ctx.db.patch(team._id, {
        plan: team.isPro ? "pro" : "basic",
        isPro: undefined,
      });
    }
    }
    return null;
  }
});

// Deploy 2: remove old field, make new field required
```

## Splitting Nested Data Into a Separate Table

```typescript
export const extractPreferences = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    for (const user of users) {
      if (user.preferences === undefined) continue;

      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!existing) {
        await ctx.db.insert("userPreferences", {
          userId: user._id,
          ...user.preferences,
        });
      }

      await ctx.db.patch(user._id, { preferences: undefined });
    }
    return null;
  },
});
```

Make sure your code is already writing to the new `userPreferences` table for new users before running this migration, so you don't miss documents created during the migration window.

## Cleaning Up Orphaned Documents

```typescript
export const deleteOrphanedEmbeddings = internalMutation({
  handler: async (ctx) => {
    const embeddings = await ctx.db.query("embeddings").take(100);
    for (const doc of embeddings) {
    const chunk = await ctx.db
      .query("chunks")
      .withIndex("by_embedding", (q) => q.eq("embeddingId", doc._id))
      .first();

    if (!chunk) {
      await ctx.db.delete(doc._id);
    }
    }
    return null;
  },
});
```

## Zero-Downtime Strategies

During the migration window, your app must handle both old and new data formats. There are two main strategies.

### Dual Write (Preferred)

Write to both old and new structures. Read from the old structure until migration is complete.

1. Deploy code that writes both formats, reads old format
2. Run migration on existing data
3. Deploy code that reads new format, still writes both
4. Deploy code that only reads and writes new format

This is preferred because you can safely roll back at any point, the old format is always up to date.

```typescript
// Bad: only writing to new structure before migration is done
export const createTeam = mutation({
  args: { name: v.string(), isPro: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.insert("teams", {
      name: args.name,
      plan: args.isPro ? "pro" : "basic",
    });
  },
});

// Good: writing to both structures during migration
export const createTeam = mutation({
  args: { name: v.string(), isPro: v.boolean() },
  handler: async (ctx, args) => {
    const plan = args.isPro ? "pro" : "basic";
    await ctx.db.insert("teams", {
      name: args.name,
      isPro: args.isPro,
      plan,
    });
  },
});
```

### Dual Read

Read both formats. Write only the new format.

1. Deploy code that reads both formats (preferring new), writes only new format
2. Run migration on existing data
3. Deploy code that reads and writes only new format

This avoids duplicating writes, which is useful when having two copies of data could cause inconsistencies. The downside is that rolling back to before step 1 is harder, since new documents only have the new format.

```typescript
// Good: reading both formats, preferring new
function getTeamPlan(team: Doc<"teams">): "basic" | "pro" {
  if (team.plan !== undefined) return team.plan;
  return team.isPro ? "pro" : "basic";
}
```

## Small Table Shortcut

For genuinely small tables (few thousand rows max), a single `internalMutation` is acceptable:

```typescript
import { internalMutation } from "./_generated/server";

export const backfillSmallTable = internalMutation({
  handler: async (ctx) => {
    const docs = await ctx.db.query("smallConfig").collect();
    for (const doc of docs) {
      if (doc.newField === undefined) {
        await ctx.db.patch(doc._id, { newField: "default" });
      }
    }
  },
});
```

```bash
npx convex run migrations:backfillSmallTable
```

Only use `.collect()` when you are sure the table is small.
For larger tables, prefer paginated batches with self-scheduling.

## Verifying a Migration

Check for unmigrated rows without query `.filter()`:

```typescript
import { query } from "./_generated/server";

export const verifyMigration = query({
  handler: async (ctx) => {
    const sample = await ctx.db.query("users").take(100);
    const remaining = sample.filter((u) => u.role === undefined);

    return {
      complete: remaining.length === 0 && sample.length < 100,
      sampleRemaining: remaining.map((u) => u._id),
    };
  },
});
```
