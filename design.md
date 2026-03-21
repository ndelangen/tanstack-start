# Dune UI Design Memory

This file is the source of truth for the Dune aesthetic used in forms and editor UIs.
Future changes should preserve this language unless explicitly asked to diverge.

## Core Aesthetic

- Compact and concise over spacious.
- Glass surfaces with subtle blur on interactive containers.
- Strong `2px` borders as a primary visual motif.
- Controls should stand out clearly over glass surfaces with strong contrast.
- Warm sand palette aligned with `public/web/page.jpg` and `public/web/head.png`.
- Icon-only action controls as the default, with clear tooltip labels.

## Design Tokens

Global tokens live in `src/app/styles/tokens.css` and are imported by `src/app/routes/__root.tsx`.

### Color Roles

- `--color-text`: primary text
- `--color-muted`: secondary/help text
- `--color-link`: links
- `--color-error`: destructive/error states
- `--color-accent`, `--color-accent-strong`: highlights and active emphasis
- `--color-focus-ring`: focus outlines

### Button Semantics

- `Confirm` (`--button-confirm-*`): primary save/commit actions; use a green family so confirmation stands out.
- `Neutral` (`--button-neutral-*`): non-destructive controls that should not draw strong attention.
- `Add` (`--button-add-*`): additive operations (`+`, create/add row).
- `Danger` (`--button-danger-*`): destructive operations (delete/remove/reset-hard).
- `Toggle` (`--button-toggle-*`): pressed/unpressed toggle controls (`aria-pressed`).
- Disabled controls must use muted solid variants of their semantic family.

### Glass + Surface

- `--glass-surface-0`, `--glass-surface-1`, `--glass-surface-2`
- `--glass-input`, `--glass-overlay`
- `--glass-blur-sm`, `--glass-blur-md`

### Shared Form Foundations

- `--panel-bg`, `--panel-border`, `--panel-shadow`, `--panel-radius`
- `--input-bg`, `--input-border`
- `--border-strong` (canonical 2px border)
- `--input-border-strong`, `--field-shadow` for high-contrast controls

### Radius, Spacing, Sizing

- `--radius-sm`, `--radius-md`, `--radius-pill`
- `--space-1` through `--space-6`
- `--card-padding`, `--gap-sm`, `--gap-md`, `--gap-lg`
- `--control-h-sm`, `--control-h-md`
- `--control-px-sm`, `--control-px-md`
- `--icon-sm`, `--icon-md`

## Component Conventions

## Form Primitives (`src/app/components/form`)

- Use `FormField` for label/hint/error semantics.
- Inputs should flow through `FormInput` and `FormTextarea`.
- Action buttons should be icon-only by default (`add`, `remove`, `reset`, `preview`, `edit`, `delete`).
- Use `FormTooltip` for icon-only controls.
- Use `FormPopover` for lightweight previews/configuration.
- Use `FormSelect` instead of native `<select>` for theme consistency when practical.
- Buttons should be solid color, borderless, and shadowless in base/hover/active states.
- Focus indicators may use ring shadows for accessibility; drop shadows are otherwise reserved for panels/surfaces.

## Accessibility Requirements

- Icon-only actions must include `aria-label`.
- Inputs with errors should set `aria-invalid` and expose error text through `aria-describedby`.
- Tooltips are additive, not the only source of critical information.
- Focus indicators must remain clearly visible on glass backgrounds.
- Keep keyboard workflows first-class for combobox/select/popover interactions.

## Faction Editor UX Patterns

- Keep accordion sections dense but scannable.
- Use shared layout primitives to keep spacing and alignment consistent:
  - `formRow` for flex-aligned controls
  - `arrayCardGrid` for repeated card fields
  - `formRowActions` for icon action alignment
- Keep tiny asset previews near pickers/popovers.
- For destructive actions, use danger styling + trash icon + tooltip.
- For additive actions, use plus icon + tooltip (no visible text label).
- In the editor toolbar, `Reset` and `Close` are destructive intents and should use danger styling.
- For stateful toggles that add/remove optional content, icon can change by state
  (e.g., inactive `Rotate3d`, active `CircleOff`) to make active state obvious.

## Do / Don't

- Do reuse tokens before introducing literals.
- Do keep border thickness and blur consistent with form primitives.
- Do keep control surfaces (buttons/inputs/selects) flat; reserve drop shadow for panel-like containers.
- Do use compact spacing unless content readability suffers.
- Don't introduce bright saturated colors that clash with the desert palette.
- Don't use text-heavy button bars where icons are sufficient.
- Don't add new one-off styling systems outside the token layer.

## Migration Checklist For New Pages

1. Import and use shared form components from `@app/components/form`.
2. Replace plain inputs/buttons/selects with tokenized variants.
3. Add tooltips to icon-only actions.
4. Add popovers where previews or contextual controls improve speed.
5. Verify keyboard navigation and visible focus states.
6. Confirm visuals match glass + 2px border + compact rhythm.
