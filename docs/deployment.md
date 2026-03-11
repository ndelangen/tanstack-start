# Deployment

## Netlify

Application deploys to Netlify as a Single Page Application (SPA).

## Build Process

**Config**: [`netlify.toml`](../netlify.toml)
- **Build command**: `bun run app:build`
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

Set in Netlify dashboard or via CLI:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

**Note**: Vite requires `VITE_` prefix for client-side environment variables.

## Deployment Flow

```mermaid
flowchart LR
    Git[Git Push] --> Netlify[Netlify Build]
    Netlify --> Install[Install Dependencies]
    Install --> Build[bun run app:build]
    Build --> Deploy[Deploy dist/client]
    Deploy --> Live[Live Site]
```
