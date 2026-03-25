# UI component hierarchy and composition

## Principles

### React is the composition engine

Shared visuals are expressed by composing **components** and **`className` lists** (typically with `clsx`) in TypeScript/TSX. We do **not** use CSS Modules `composes` for reuse: it obscures dependency direction at build time and encourages the wrong mental model (e.g. generic controls “inheriting” from form-specific sheets).

### Strict dependency direction

More primitive / generic layers **must not** depend on more specific ones:

| Layer | Path | May import from |
|-------|------|-----------------|
| Primitives | `src/app/components/generic/ui/**` | Other `generic/ui` modules, shared tokens |
| Form | `src/app/components/generic/form/**` | `generic/ui`, shared tokens |
| Layout / surfaces | `src/app/components/generic/layout/**`, `src/app/components/generic/surfaces/**` | `generic/ui`, `generic/form`, shared tokens |
| Features / routes | domain folders (`factions`, `faq`, `profile`, `auth`) and `routes` | `generic/**`, shared tokens, same-domain modules |

**Forbidden:** anything in `generic/**` importing from domain folders.

### Role of CSS Modules

CSS Modules provide **scoped class names** and hook into design tokens (`var(--…)`). Prefer **one concern per class**; when an element needs “base + modifier” behavior, apply **multiple classes in TSX** (`clsx(base, modifier, local)`) instead of `composes`.

### Owning a CSS module (no cross-imports)

**Anti-pattern:** a component importing **`AnotherThing.module.css`** when that file “belongs” to another component or folder (e.g. a feature importing `ui/Input.module.css` directly). That hides the real API and scatters styling ownership.

**Do this instead:** import the **TSX primitive** that owns the stylesheet (e.g. `TextField`, `MultilineTextField`, `textFieldClassNames` from [`TextField.tsx`](../../src/app/components/generic/form/TextField.tsx)), or import a composed control from `src/app/components/generic/form/` (see below). Only the file that ships with the module should import `TextField.module.css`.

### Shared control styles

Low-level icon/button chrome lives under **`src/app/components/generic/ui/`** (`IconButton`). Field-control chrome lives under **`src/app/components/generic/form/`** (`TextField.module.css`).

Form-specific layout and labels stay in `generic/form/Form.module.css` and form components; they compose primitives in React—**without** importing another module's CSS directly.

**`TextField` `unstyled`:** use when the control sits inside another chrome (e.g. [`PrefixedField`](../../src/app/components/generic/form/PrefixedField.tsx)) and local CSS removes borders/background so the outer shell provides the single border.

### Naming (form layer)

| Name | Role |
|------|------|
| `FormField` | Label, hint, error chrome around a child control (not a text box by itself). |
| `TextField`, `MultilineTextField`, `OptionPicker`, pickers | Composed field controls for product UI. |
| `PrefixedField` | Affix container (prefix/suffix) sharing one bordered “input” shell; children often use `TextField` with `unstyled`. |
| `FormPrefixedInput` | Deprecated alias of `PrefixedField`; do not use in new code. |

### Standard form controls (composed API)

Prefer these exports from `src/app/components/generic/form` for product UI:

| Component | Purpose |
|-----------|---------|
| `TextField` | Single-line text |
| `MultilineTextField` | Multi-line text |
| `OptionPicker` | Single choice from a list (Radix select) |
| `TypeSuggestPicker` | Domain-specific today; import `AssetAutocomplete` from `factions/editor` until a truly generic typeahead exists. |
| `HexColorPicker` | Compact hex color control: swatch, popover (`react-colorful`), and hex text in a `PrefixedField` (app-wide; lives in `generic/form/`) |
| `ColorPicker` | Domain-specific today; use faction editor `BackgroundColorSlot` directly until a truly generic color-slot component exists. |
| `PrefixedField` | Prefix/suffix + shared border around the main control |

Modules colocated with faction editor implementations should import `AssetAutocomplete` and `BackgroundColorSlot` from `factions/editor` directly rather than exposing them from generic form barrels.

## Diagram

```mermaid
flowchart TB
  subgraph ui [ui primitives]
    IconButtonTSX[IconButton.tsx]
  end
  subgraph form [form layer]
    TextFieldBase[TextField.tsx owns TextField.module.css]
    TextField[TextField]
    Multiline[MultilineTextField]
    OptionPicker[OptionPicker]
    TypeSuggest[TypeSuggestPicker]
    ColorPicker[ColorPicker]
    PrefixedField[PrefixedField]
    FormBtn[FormButton]
    FormModuleCSS[Form.module.css]
  end
  subgraph features [features routes]
    Routes[Features and routes]
  end
  TextFieldBase --> TextField
  TextFieldBase --> Multiline
  TextFieldBase --> OptionPicker
  TextFieldBase --> TypeSuggest
  TextFieldBase --> ColorPicker
  TextFieldBase --> PrefixedField
  FormModuleCSS --> TextField
  FormModuleCSS --> OptionPicker
  FormModuleCSS --> PrefixedField
  IconButtonTSX --> FormBtn
  TextField --> Routes
  Multiline --> Routes
  OptionPicker --> Routes
  TypeSuggest --> Routes
  ColorPicker --> Routes
```

## Guardrails

- After changes, confirm there are **no** `composes:` declarations in project `*.css` files (`rg 'composes:' --glob '*.css'`).
- Optional: `TextField.module.css` should only be imported by `TextField.tsx`.
- Optional: add Stylelint or CI checks to forbid `composes` in new CSS.
