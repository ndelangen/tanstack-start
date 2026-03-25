---
name: ui-create-standards
description: Build new UI using existing components and repo design standards. Use when adding or changing UI, creating components, refactoring views, or making layout/styling decisions. Enforce reuse-first, flex+gap layout, no margin-based component spacing, Storybook stories for new generic components, and ask focused questions when extraction/generalization is unclear.
---

# UI Create Standards

## When To Use

Use this skill whenever work includes:

- New screens, sections, or controls
- Component refactors or extractions
- Styling/layout changes
- New generic or shared UI components

## Non-Negotiable Rules

1. Reuse existing components first.
2. Follow repo component hierarchy and ownership rules from [docs/technical/ui-component-hierarchy.md](../../../docs/technical/ui-component-hierarchy.md).
3. Avoid `margin` in components by default; use layout wrappers with flex and `gap`.
4. New generic components must ship with `*.stories.tsx`.
5. If uncertain about best generalization/extraction, ask the user a focused question before finalizing.

## Reuse-First Workflow (Strict)

### Step 1: Discover existing building blocks

Before creating anything new, check:

- `src/app/components/ui` for primitives
- `src/app/components/form` for composed controls
- Relevant feature components under `src/app/components/**`
- Existing route patterns under `src/app/routes/_app/**`

If an existing component can work with small extension (`props`, `className`, composition), extend it instead of creating a new component.

### Step 2: Decide where code belongs

- **Primitive**: generic, low-level UI (`ui/**`)
- **Form control**: composed input/control patterns (`form/**`)
- **Feature component**: domain-specific (`components/<feature>/**` or route-local)

Respect dependency direction:

- `ui` may import only `ui` + shared tokens
- `form` may import `ui` + shared tokens
- features/routes may import `form` and `ui`
- Never import upward (e.g. `ui` importing `form` or features)

### Step 3: Implement with composition

- Prefer composing existing primitives in TSX.
- Do not use CSS `composes`.
- Keep CSS module ownership local to its TSX owner.
- Do not import another component's CSS module directly.

## Layout And Spacing Rules

### Default policy

- Do not use `margin` for normal component spacing.
- Use reusable layout wrappers and flexbox + `gap`.
- Keep spacing orchestration in parent layout containers, not leaf controls.

### Allowed exceptions

Use margin only when truly required (e.g. unavoidable third-party integration constraints). If used, document why in the implementation notes.

## Action Intent And Variant Mapping

Use semantic intent first, then select variant.

- **Primary positive actions** (`Create`, `Start`, `Add`, `Save`, `Confirm`) use green confirm styling by default.
  - `IconButton`: use `variant="confirm"` (or omit `variant`; default is confirm in [IconButton.tsx](../../../src/app/components/ui/IconButton.tsx)).
  - `FormButton`: use default/`variant="primary"`.
- **Neutral or auxiliary actions** (secondary options, optional tools) use `secondary` or `nav`.
- **Destructive actions** (`Delete`, `Remove`, irreversible mutations) use `critical`/`danger`.

Confirm styling maps to green button tokens in [Button.module.css](../../../src/app/components/ui/Button.module.css).

### Toolbar rule

In toolbars with multiple actions, the single primary positive action must use green confirm styling unless product requirements explicitly say otherwise.

## Storybook Requirements For Generic Components

When adding a new generic component, also add/update `*.stories.tsx` in the same area.

Minimum story coverage:

1. Default state
2. Key variants (size/intent/visual modes)
3. Interactive states when relevant (disabled/loading/error/selected, etc.)
4. Composition example showing expected usage in a layout wrapper

If component behavior is non-obvious, include concise story args/docs to clarify intended use.

## Extraction And Generalization Policy

When writing new UI, proactively check whether repeated or reusable structure should be extracted.

Extract when:

- Pattern appears in multiple features/routes
- API can stay small and coherent
- It reduces duplication without adding indirection confusion

Do not extract when:

- Usage is single, highly domain-specific, or unstable
- A generic API would be unclear or overly broad

If uncertain, ask the user 1 focused question about intended reuse scope before committing to an abstraction.

## Clarifying-Question Triggers

Ask the user when any of these are unclear:

- Should this remain feature-specific or become a shared generic component?
- Which API surface is preferred for reuse (`props` shape, variants, composition model)?
- Should this new pattern become a `ui` primitive, `form` control, or feature component?

## Final Validation Checklist

- [ ] Reuse-first search completed before adding new component
- [ ] Component layer placement matches dependency direction
- [ ] No CSS `composes` introduced
- [ ] No cross-owned CSS module imports introduced
- [ ] No new margin-based spacing in components (unless explicitly justified)
- [ ] Layout spacing handled with flex + `gap` via reusable layout wrappers
- [ ] Primary positive actions use green confirm styling (`IconButton.confirm` / `FormButton.primary`)
- [ ] Toolbar hierarchy has one clear primary action with confirm styling
- [ ] Any non-green primary positive action includes explicit rationale or user approval
- [ ] New generic component has `*.stories.tsx` with required coverage
- [ ] Extraction/generalization choices are explicit; user asked if uncertain

