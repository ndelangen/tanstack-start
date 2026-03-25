# UI design decisions

This document records durable UI decisions for consistency across features.

## How to use this log

- Treat entries with `Status: accepted` as defaults.
- If a change needs to violate an accepted decision, get explicit user approval first.
- Add new entries instead of silently changing old ones.

## Entry template

```md
## DD-XXX: Decision title
- Status: accepted | proposed | superseded
- Context: Why this decision exists.
- Rule: The default behavior to follow.
- Examples: Concrete examples and mappings.
- Exceptions: Allowed exceptions and approval requirements.
- Changed on: YYYY-MM-DD
```

## DD-001: Reuse existing shared components first
- Status: accepted
- Context: UI drift and duplication increase when new components are created before surveying existing primitives.
- Rule: Always check `src/app/components/generic/ui`, `src/app/components/generic/form`, `src/app/components/generic/layout`, and `src/app/components/generic/surfaces` before creating new UI components.
- Examples:
  - Extend with `props`, `className`, or composition before introducing a new shared component.
  - Keep feature-local code local unless the pattern clearly repeats.
- Exceptions:
  - New component is allowed when no existing component can satisfy requirements without awkward API growth.
  - Confirm with user before creating a new shared API if reuse options are not exhausted.
- Changed on: 2026-03-25

## DD-002: Component layering and dependency direction
- Status: accepted
- Context: Layer violations (`generic` importing domain code) create tight coupling and brittle reuse.
- Rule: Preserve direction `generic/ui` -> `generic/form` -> `generic/layout|generic/surfaces` -> `features/routes`. Never import upward.
- Examples:
  - `generic/ui/**` imports only `generic/ui` and shared tokens.
  - `generic/form/**` can import `generic/ui` and shared tokens.
  - Features/routes can import `generic/**`.
- Exceptions:
  - None by default; treat violations as architecture exceptions requiring explicit approval.
- Changed on: 2026-03-25

## DD-003: Layout spacing uses reusable wrappers, flex + gap, and grid
- Status: accepted
- Context: Margin-led spacing in leaf components causes inconsistent layout behavior.
- Rule: Handle spacing and alignment in reusable parent layout wrappers. Prefer flexbox + `gap` for one-dimensional layout and CSS Grid for two-dimensional layout.
- Examples:
  - Use stack/row/grid-style wrappers to orchestrate spacing.
  - Keep leaf controls focused on control concerns, not page spacing.
- Exceptions:
  - Margin may be used only for unavoidable third-party constraints and should be documented in implementation notes.
- Changed on: 2026-03-25

## DD-004: Avoid custom CSS and prohibit CSS composes
- Status: accepted
- Context: Excess custom CSS and cross-module style composition hide ownership and reduce maintainability.
- Rule: Prefer composing existing components and classes in TSX. Avoid custom CSS when existing primitives/wrappers solve the need. Do not use CSS `composes`.
- Examples:
  - Apply multiple classes with `clsx` in component code rather than style inheritance.
  - Keep CSS module ownership local to the component that owns it.
- Exceptions:
  - Custom CSS can be added when composition cannot satisfy requirements and the exception is explicitly approved.
- Changed on: 2026-03-25

## DD-005: Icon-only buttons are for established actions with explicit semantics
- Status: accepted
- Context: Icon-only actions are harder to parse and can become ambiguous without consistent semantics.
- Rule: Use icon-only buttons for common, recognizable actions and pair them with clear intent/variant selection.
- Examples:
  - Primary positive toolbar action should use confirm semantics where applicable.
  - Destructive icon-only actions should use danger/critical semantics.
  - Use accessible labeling (for example `aria-label`) so meaning is explicit.
- Exceptions:
  - If icon meaning is ambiguous for the context, prefer text-labeled button or composite control.
- Changed on: 2026-03-25

## DD-006: Toolbar primary-action hierarchy
- Status: accepted
- Context: Toolbars become noisy when multiple actions compete as primary.
- Rule: In a multi-action toolbar, keep one clear primary positive action; style it with confirm semantics unless product direction says otherwise.
- Examples:
  - `Create`, `Start`, `Add`, `Save`, `Confirm` default to confirm/primary positive styling.
  - Secondary and utility actions use secondary/nav styles.
- Exceptions:
  - Non-confirm primary action is allowed only with explicit product/user direction.
- Changed on: 2026-03-25

## DD-007: Button color intent mapping
- Status: accepted
- Context: Inconsistent color semantics make actions unpredictable and increase user error risk.
- Rule: Choose variant by semantic intent first, then visual style.
- Examples:
  - Positive primary actions: `confirm` (or primary where confirm is not available).
  - Neutral/auxiliary actions: `secondary` or `nav`.
  - Destructive/irreversible actions: `critical` or `danger`.
- Exceptions:
  - Product-directed visual overrides are allowed with explicit instruction.
- Changed on: 2026-03-25

## DD-008: Generic components require Storybook stories
- Status: accepted
- Context: Stories document usage, prevent regressions, and improve AI discoverability of intended APIs.
- Rule: Every new generic component must include `*.stories.tsx` in the same area.
- Examples:
  - Include default state, key variants, relevant interaction states, and a composition example in a reusable layout wrapper.
- Exceptions:
  - No default exceptions; missing stories should block completion for new generic components.
- Changed on: 2026-03-25

## DD-009: Prefer small composable components over large monoliths
- Status: accepted
- Context: Very large components are harder to reuse, test, and reason about.
- Rule: Split UI into small, focused components when responsibilities or API surface grows.
- Examples:
  - Extract repeated sub-structures into composable subcomponents.
  - Keep each component focused on a single concern.
- Exceptions:
  - Short-lived feature-local components may stay combined temporarily if extraction adds noise; revisit if reuse emerges.
- Changed on: 2026-03-25

## DD-010: Component placement is generic-first but domain-honest
- Status: accepted
- Context: Shared components were difficult to discover and domain-specific code was occasionally exposed as generic API.
- Rule: Place components under `src/app/components/generic/**` only when they are reusable across multiple pages/features and have no domain coupling. Otherwise place them under a domain folder (`factions`, `faq`, `profile`, `auth`, etc).
- Examples:
  - Reusable controls/layout/surfaces belong to `generic/ui`, `generic/form`, `generic/layout`, `generic/surfaces`.
  - Faction editor widgets stay under `factions/editor` and are imported directly from that domain.
- Exceptions:
  - None by default. Duplicate wrappers and parallel import paths for the same shared component are not allowed.
- Changed on: 2026-03-25

## DD-011: One shared component, one canonical path
- Status: accepted
- Context: Parallel paths (`components/ui` plus `components/generic/ui`) made shared components hard to discover and caused duplicate usage patterns.
- Rule: Shared components must exist only under `src/app/components/generic/**` and be imported via `@app/components/generic/...`.
- Examples:
  - `Button` and `IconButton` live in `generic/ui`.
  - `TextField` and `FormButton` live in `generic/form`.
  - `Card`, `Page`, and `Block` live in `generic/surfaces`.
- Exceptions:
  - None by default.
- Changed on: 2026-03-25
