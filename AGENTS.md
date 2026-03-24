<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Project Quick Context

- Start with [`docs/README.md`](docs/README.md) for architecture and workflow links.
- Stack: TanStack Router/Query, Convex, Vite, and Storybook.
- Non-obvious workflow: `npm run generate` refreshes generated game data outputs.

## Validation Convention

Follow the canonical validation guidance in [`docs/data-layer.md`](docs/data-layer.md):

- Convex `v` validators for boundary shape/type checks.
- Shared Zod schemas parsed in Convex handlers (`safeParse`) for authoritative semantic/business rules.
- Client-side parsing only for UX feedback.
