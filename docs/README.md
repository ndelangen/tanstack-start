# Documentation

Quick reference for understanding and working with the codebase.

## Entry Points

**Starting a new feature?**
1. Routes: `src/app/routes/` (file-based routing)
2. Domain logic: `src/app/<domain>/db.ts` (data access hooks)
3. Schemas: `src/app/<domain>/validation.ts` and `src/game/schema/` (Zod schemas)
4. Validation standard: [`docs/data-layer.md`](./data-layer.md) (Convex `v` + shared Zod)

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
npm run convex:dev       # Start Convex dev runtime
npm run convex:deploy    # Deploy Convex functions/schema

# Code quality
npm run biome:check      # Lint and format
npm run test             # Run tests
npm run storybook        # Storybook dev (port 6006)
npm run build-storybook  # Static Storybook → storybook-static
npm run generate         # Regenerate src/game/data/generated.ts + generated/index.json
npm run capture          # Screenshots/PDFs (requires storybook-static from build-storybook)
```

## Common Workflows

### Adding a New Domain

1. Create Zod schema in `src/app/domain-name/validation.ts` (or `src/game/schema/` for game-domain types):
   ```typescript
   import { z } from 'zod';
   export const schema = z.object({ ... });
   ```

2. Create domain db file in `src/app/domain-name/db.ts`:
   - Types (wrap DB types)
   - Query keys (hierarchical structure)
   - Query hooks (`useDomain...`)
   - Mutation hooks (`useCreateDomain`, `useUpdateDomain`, etc.)

3. Add/update Convex schema & functions in `convex/`.
4. Run/deploy Convex:
   ```bash
   npm run convex:dev
   npm run convex:deploy
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

## Game assets (`src/game`, `public/`, `generated/`)

Dune card/faction rendering, Storybook, and static art live here. `generated/` holds JPEGs from `scripts/capture.ts` and `index.json` from `scripts/generate.ts`; it is large—consider [Git LFS](https://git-lfs.com/) if clones get slow.

## Detailed Documentation

- [Architecture](./architecture.md) - Request flow, structure, tsconfig paths
- [Data Layer](./data-layer.md) - Domain patterns, DB syncing, structure
- [Routing](./routing.md) - Route configuration, file-based routing
- [Authentication](./authentication.md) - Auth patterns, Convex Auth integration
- [User Data Contract](./user-data-contract.md) - What belongs in `users` vs `profiles`
- [State Management](./state-management.md) - TanStack Query, cache patterns
- [Membership](./membership.md) - Group membership approval flow
- [Deployment](./deployment.md) - Netlify deployment process
- [Convex Migrations](./convex-migrations.md) - Required widen/migrate/verify/narrow runbook + CI/deploy guards
