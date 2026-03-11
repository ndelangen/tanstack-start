# Documentation

Quick reference for understanding and working with the codebase.

## Entry Points

**Starting a new feature?**
1. Routes: `src/app/routes/` (file-based routing)
2. Domain logic: `src/app/db/domains/` (data access hooks)
3. Schemas: `src/data/` (Zod schemas)

**Debugging?**
- Router: [`src/app/router.tsx`](../src/app/router.tsx)
- Root route: [`src/app/routes/__root.tsx`](../src/app/routes/__root.tsx)
- Database client: [`src/app/db/core/index.ts`](../src/app/db/core/index.ts)

## Key Commands

```bash
# Development
npm run app:dev           # Start dev server (port 3000)
npm run app:build         # Build for production
npm run app:preview       # Preview production build locally

# Database
npm run db:types         # Generate TypeScript types from Supabase schema
npm run db:schemas       # Sync Zod schemas to DB migrations
npm run db:migration     # Create new migration
npm run db:push          # Push migrations to Supabase

# Code quality
npm run biome:check      # Lint and format
npm run test             # Run tests
```

## Common Workflows

### Adding a New Domain

1. Create Zod schema in `src/data/domain-name.ts`:
   ```typescript
   import { z } from 'zod';
   export const schema = z.object({ ... });
   ```

2. Create domain file in `src/app/db/domains/domain-name.ts`:
   - Types (wrap DB types)
   - Query keys (hierarchical structure)
   - Query hooks (`useDomain...`)
   - Mutation hooks (`useCreateDomain`, `useUpdateDomain`, etc.)

3. Sync schema to DB:
   ```bash
   npm run db:schemas
   npm run db:push
   ```

4. Generate types:
   ```bash
   npm run db:types
   ```

### Adding a New Route

1. Create file in `src/app/routes/`:
   - `index.tsx` → `/`
   - `about.tsx` → `/about`
   - `users/$userId.tsx` → `/users/:userId`

2. Use loader for data:
   ```typescript
   export const Route = createFileRoute('/path')({
     loader: async () => { ... },
     component: Component,
   });
   ```

3. Route tree auto-generates from file structure.

## Detailed Documentation

- [Architecture](./architecture.md) - Request flow, structure, tsconfig paths
- [Data Layer](./data-layer.md) - Domain patterns, DB syncing, structure
- [Routing](./routing.md) - Route configuration, file-based routing
- [Authentication](./authentication.md) - Auth patterns, Supabase integration
- [State Management](./state-management.md) - TanStack Query, cache patterns
- [Membership](./membership.md) - Group membership approval flow
- [Deployment](./deployment.md) - Netlify deployment process
