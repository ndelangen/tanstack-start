# Deployment

## Netlify

Application deploys to Netlify as a Single Page Application (SPA).
Production deploys are orchestrated by GitHub Actions: deploy Convex first, then publish `dist/client` to Netlify.

## Build Process

**Config**: [`netlify.toml`](../netlify.toml)
- **Default build command**: `bun run app:build`
- **Production override** (`[context.production]`): `bun run convex:deploy && bun run app:build` (legacy fallback when building directly in Netlify)
- **Publish directory**: `dist/client`

**Build configuration**: [`vite.config.ts`](../vite.config.ts)
- SPA mode enabled: `spa: { enabled: true }`
- Assets directory: `public`
- Public directory: `public`

## Routing

**Redirects file**: [`public/_redirects`](../public/_redirects)

All routes redirect to `index.html` for client-side routing:

```
/*    /index.html   200
```

This ensures TanStack Router handles all routes on the client side.

## Environment Variables

Set in **GitHub repository secrets** for CI:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOY_KEY` - Convex deploy key for `convex deploy`
- `CONVEX_DEPLOYMENT` - Convex production deployment slug/name
- `SITE_URL` - Public app URL used for OAuth redirects (Convex env)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth credentials (Convex env)
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` - Discord OAuth credentials (Convex env)
- `JWT_PRIVATE_KEY` / `JWKS` - JWT signing and discovery settings (Convex env)

Keep the same values in Netlify only if you still plan to run manual Netlify builds.

**Note**: Vite requires `VITE_` prefix for client-side environment variables.

## GitHub Action

**Workflow**: [`.github/workflows/deploy-main.yml`](../.github/workflows/deploy-main.yml)

On every push to `main`:
1. `bun install --frozen-lockfile`
2. `bun run convex:deploy`
3. `bun run migrations:deploy` (auto-run + await required Convex migrations)
4. `bun run app:build`
5. Deploy `dist/client` to Netlify using API token + site id

The Netlify publish step runs only if Convex deploy, migration verification, and build succeed.

## Netlify One-Time Setup

Production traffic should come **only** from GitHub Actions (`netlify deploy --prod` with a fresh build). The repo’s [`netlify.toml`](../netlify.toml) sets **`ignore`** so pushes to **`main` skip Netlify’s Git hook build** (exit `0` = cancel). That stops duplicate deploys where Netlify shows a preview and you had to click “Publish deploy” for production.

In Netlify UI, still verify:

1. **Site configuration → Build & deploy → Branches and deploy contexts**
   - **Production branch** = `main` (so any Netlify-side behavior stays aligned with Git).
2. **Site configuration → Build & deploy → Continuous Deployment**
   - You can leave the repo connected for Deploy Previews on non-`main` branches; `main` builds are ignored in favor of Actions.
3. Keep redirects from [`public/_redirects`](../public/_redirects) so SPA routes continue working.

If you prefer **no** Netlify Git builds at all (Actions only), disconnect the repo or set `[build] ignore = "exit 0"` and rely solely on the workflow.

## Migrations on every `main` deploy

On push to `main`, [`.github/workflows/deploy-main.yml`](../.github/workflows/deploy-main.yml) runs **`bun run migrations:deploy`** after **`bun run convex:deploy`**. That starts and waits for all widen migrations in [`convex/migration-guards.json`](../convex/migration-guards.json) (including `profiles_from_users_v1`). No separate manual migration step is required when this workflow succeeds.

## Deployment Flow

```mermaid
flowchart LR
    Git[Push main] --> GHA[GitHub Actions]
    GHA --> ConvexDeploy[Run convex deploy]
    ConvexDeploy --> Build[Run app build]
    Build --> NetlifyDeploy[Deploy dist/client]
    NetlifyDeploy --> Live[Live Site]
```

## Convex Breaking Migrations (Required)

For any migration that can invalidate existing Convex documents, follow the required runbook:

- [`docs/convex-migrations.md`](./convex-migrations.md)

Required high-level sequence:

1. Widen schema and deploy compatibility reads/writes.
2. Auto-run bounded production backfill in deploy workflow.
3. Verify zero unmigrated rows remain (CI/deploy guard).
4. Narrow schema and remove temporary fallback/migration code.

Do not deploy the narrowing schema before verification is complete.

## Go-Live Smoke Test

After each production deploy:
- Confirm site loads and routes resolve.
- Verify OAuth login (Google and Discord).
- Verify profile bootstrap/update works.
- Verify create/update flow for factions and rulesets.
- Verify FAQ create/question/answer flow.
