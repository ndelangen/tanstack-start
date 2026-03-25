---
name: ui-create-standards
description: Design and implement UI with strict reuse-first, composition-first standards and hard-stop guardrails. Use when adding or refactoring UI, creating shared components, deciding layout/styling approaches, or when consistency with existing patterns matters.
---

# Grill-Driven UI Standards

## When To Use

Use this skill whenever work includes:

- New screens, sections, or controls
- Component refactors or extractions
- Styling/layout changes
- New generic or shared UI components

## Quick Start

1. Read and apply [docs/technical/ui-design-decisions.md](../../../docs/technical/ui-design-decisions.md) before proposing implementation details.
2. Start with a short grill: ask targeted questions and provide your recommended answer for each.
3. Perform reuse-first discovery across `ui`, `form`, feature components, and nearby routes.
4. Apply hard-stop gates before custom CSS, new component APIs, or pattern deviation.
5. Build with small composable components and reusable layout primitives first.
6. Add Storybook stories for all new generic components.

## Grill-Me Loop (Required Before Finalizing)

Interview the plan relentlessly until ambiguity is removed. For each question, provide your recommended answer.

Required question set (adapt as needed):

- Which existing primitives/composed controls can solve this with small extension?
- Should this be feature-local or shared (`ui`/`form`)?
- What API keeps the component generic and composable, not monolithic?
- Which layout primitive should own spacing and alignment?
- Can we avoid custom CSS by composing existing classes/components?
- Which nearby pattern should this follow for consistency?

If a question can be answered by exploring the codebase, explore first, then continue grilling.

## Hard-Stop Guardrails (Non-Negotiable)

Stop and ask the user before proceeding when any condition is true:

1. You are about to introduce custom CSS but existing primitives/layout wrappers may suffice.
2. You are about to create a new shared component/API before exhausting extension/composition of existing components.
3. You are about to ship a UI pattern that differs from nearby established patterns without explicit user direction.
4. You are about to create a large, multi-responsibility component instead of composing smaller parts.

Do not continue implementation until the user confirms the exception.

## Reuse-First Workflow

### 1) Discover existing building blocks first

Check these areas before creating anything new:

- `src/app/components/ui`
- `src/app/components/form`
- Relevant feature components under `src/app/components/**`
- Existing route patterns under `src/app/routes/_app/**`

If existing components can solve the need with small extension (`props`, `className`, composition), extend instead of adding a new component.

### 2) Place code in the correct layer

- **Primitive**: generic low-level UI (`ui/**`)
- **Form control**: composed input/control patterns (`form/**`)
- **Feature component**: domain-specific (`components/<feature>/**` or route-local)

Dependency direction is strict:

- `ui` imports only `ui` + shared tokens
- `form` imports `ui` + shared tokens
- features/routes import `form` and `ui`
- never import upward (`ui` must not import `form` or features)

### 3) Compose, do not over-build

- Prefer composing existing primitives in TSX.
- Avoid custom CSS when possible.
- Never use CSS `composes`.
- Keep CSS module ownership local to the TSX owner.
- Do not import another component's CSS module directly.

## Layout and Styling Rules

- Prefer reusable layout components/wrappers for spacing and alignment orchestration.
- Prefer flexbox + `gap` for one-dimensional layouts.
- Prefer CSS Grid for two-dimensional layouts.
- Avoid `margin` for routine component spacing; keep spacing decisions in parent layout containers.
- Use custom CSS only when composition cannot satisfy requirements and user has approved via hard-stop.

## Generic Component and Storybook Requirements

For every new generic component, add `*.stories.tsx` in the same area.

Minimum story coverage:

1. Default state
2. Key variants
3. Relevant interactive states
4. Composition example in a reusable layout wrapper

Stories are required for both developer validation and AI discoverability of intended usage.

## Size and Composition Constraint

Avoid extremely large components. Prefer splitting into smaller composable units when:

- A component has multiple responsibilities
- Repeated sub-structures appear
- API becomes broad or confusing
- Testing/reasoning gets harder at the current size

## Canonical Reference

Consult and enforce decisions from:

[docs/technical/ui-design-decisions.md](../../../docs/technical/ui-design-decisions.md)

Follow hierarchy, dependency, and CSS ownership rules in:

[docs/technical/ui-component-hierarchy.md](../../../docs/technical/ui-component-hierarchy.md)

## Final Checklist

- [ ] Grill questions asked (with recommended answers) where ambiguity existed
- [ ] Reuse-first discovery completed before creating anything new
- [ ] Hard-stop gates enforced for CSS/component/pattern exceptions
- [ ] Layer placement follows `ui` -> `form` -> features dependency direction
- [ ] Layout uses reusable wrappers with flex+`gap` and/or grid
- [ ] No margin-led spacing orchestration (unless approved exception)
- [ ] No CSS `composes` and no cross-owned CSS imports
- [ ] Generic components include Storybook stories with composition examples
- [ ] Component boundaries remain small and composable
