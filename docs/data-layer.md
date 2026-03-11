# Data Layer

## Domain File Structure

```mermaid
flowchart TD
    Schema[Zod Schema<br/>src/data/] --> DomainFile[Domain File<br/>src/app/db/domains/]
    DomainFile --> Types[Types]
    DomainFile --> QueryKeys[Query Keys]
    DomainFile --> Queries[Query Hooks]
    DomainFile --> Mutations[Mutation Hooks]
    Queries --> TanStackQuery[TanStack Query]
    Mutations --> TanStackQuery
    TanStackQuery --> Supabase[(Supabase DB)]
```

Each domain file follows this structure: types → query keys → queries → mutations.

## DB Syncing

Zod schemas in `src/data/` sync to database migrations.

**Command**: `npm run db:schemas`

**How it works**:
1. Scans `src/data/*.ts` for exported `schema` (ZodObject)
2. Converts to JSON Schema
3. Compares with existing migrations
4. Generates new migration if schema changed: `supabase/migrations/TIMESTAMP_domain_data_validation.sql`
5. Creates CHECK constraint using `pg_jsonschema` extension

**Script**: [`scripts/db-sync-data-schema.ts`](../scripts/db-sync-data-schema.ts)

**Workflow**:
```bash
# After changing a schema in src/data/
npm run db:schemas    # Generate migration
npm run db:push       # Apply to Supabase
npm run db:types      # Regenerate TypeScript types
```

## Basic DB Structure

**Tables**: factions, groups, group_members, profiles

**Pattern**: Domain data in JSONB `data` column, validated with Zod. Factions use soft delete; groups use hard delete.

**Type generation**: `npm run db:types` generates [`src/app/db/core/types.ts`](../src/app/db/core/types.ts) from Supabase schema.

## Domain File Pattern

### 1. Types

Wrap database types with domain types:

```typescript
export type FactionEntry = Omit<Tables<'factions'>, 'data'> & {
  data: Faction;  // Validated Zod type
};
```

### 2. Query Keys

Hierarchical structure for cache invalidation:

```typescript
export const domainKeys = {
  all: ['domain'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (filters: object) => [...domainKeys.lists(), filters] as const,
  detail: (id: string) => [...domainKeys.all, 'detail', id] as const,
};
```

**Example**: [`src/app/db/domains/factions.ts`](../src/app/db/domains/factions.ts)

## Data Validation

Zod schemas in `src/data/` validate at runtime:

- Before database operations (mutations)
- After database reads (queries)
- Type inference: `type Faction = z.infer<typeof schema>`

**Example**: [`src/data/factions.ts`](../src/data/factions.ts)

## Soft Delete Pattern

Factions use `is_deleted` flag instead of hard deletes:

- Queries filter: `.eq('is_deleted', false)`
- Delete mutation sets flag: `.update({ is_deleted: true })`

**Example**: [`src/app/db/domains/factions.ts`](../src/app/db/domains/factions.ts)

Groups use hard delete (actual row removal).
