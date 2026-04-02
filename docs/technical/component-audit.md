# UI Design Decision Compliance Audit

Full audit of every JSX-returning component against the [UI design decisions](./ui-design-decisions.md) (DD-001 through DD-011).

Each component is classified as either:
- **UI concern** — a legitimate, single-purpose UI abstraction whose concern can be phrased in one sentence
- **Sub-view** — a chunk of a larger view extracted without a clear, independently reusable UI concern

---

## Component Audit Table — `src/app/components/`

| File | Component | Classification | UI Concern / Purpose | Violations | Recommended Resolution |
|------|-----------|---------------|---------------------|------------|----------------------|
| `generic/surfaces/Page.tsx` | `Page` | Sub-view | Page shell with scroll-tracking header and navigation | **DD-002**: imports `@db/profiles` (upward into data layer); **DD-004**: imports non-module `Page.css` | Extract `AuthNav` into a domain wrapper or accept it as a render prop; merge `Page.css` into `Page.module.css` |
| `generic/surfaces/Page.tsx` | `AuthNav` (local) | Sub-view | Profile avatar/login link in the nav bar | **DD-002**: calls `useCurrentProfile()` inside a generic layer component | Move to `profile/` domain or pass as a slot/render prop to `Page` |
| `factions/editor/FactionFormFields.tsx` | `FactionFormFields` | Sub-view | Orchestrates all faction editor form sections | **DD-009**: 1685 lines — monolithic file with 9+ local components | Decompose into ≤ 10 focused files: `TroopSideFields`, `TtsColorsEditor`, `AccordionSection`, `GradientEditor`, `SortableTtsRow`, etc. |
| `factions/editor/FactionFormFields.tsx` | `DecalOffsetAxisSlider` (local) | UI concern | Labeled slider for decal X/Y offset | **DD-008**: no story (generic-quality control) | Extract to own file; add story |
| `factions/editor/FactionFormFields.tsx` | `IconActionButton` (local) | UI concern | Thin icon-button wrapper with tooltip | **DD-001**: duplicates `IconButton` + `FormTooltip` composition | Remove wrapper; compose inline or use shared component directly |
| `factions/editor/FactionFormFields.tsx` | `ReorderHandleButton` (local) | UI concern | Drag-handle button for dnd-kit sortable rows | **DD-008**: no story | Extract to own file if reused; add story |
| `factions/editor/FactionFormFields.tsx` | `SortableCard` (local) | UI concern | dnd-kit sortable card container | **DD-008**: no story | Extract to shared component with story |
| `factions/editor/FactionFormFields.tsx` | `SortableTtsRow` (local) | Sub-view | Sortable troop-type row with inline fields | None (domain-local, acceptable) | Keep local; extract only if file decomposition happens |
| `factions/editor/FactionFormFields.tsx` | `TroopSideFields` (local) | Sub-view | Fields for one side of a troop token | None (domain-local) | Keep local; extract during decomposition |
| `factions/editor/FactionFormFields.tsx` | `TtsColorsEditor` (local) | Sub-view | Color layer editor for troop-type sections | None (domain-local) | Keep local; extract during decomposition |
| `factions/editor/FactionFormFields.tsx` | `AccordionSection` (local) | UI concern | Collapsible section with icon header | **DD-001**: may duplicate generic collapsible pattern; **DD-008**: no story | Survey existing Radix Collapsible; extract + story if reusable |
| `factions/editor/FactionFormFields.tsx` | `GradientEditor` (local) | UI concern | Gradient stop editor with add/remove controls | **DD-001**: duplicated in `ColorLayerField.tsx`; **DD-008**: no story | Consolidate with `ColorLayerField`'s `GradientEditor` into one shared component |
| `factions/editor/FactionEditor.tsx` | `FactionEditor` | Sub-view | Faction create/edit form orchestrator with save/load/delete | **DD-009**: 604 lines with embedded popover state logic | Extract `GroupAssignPopover`, `FactionLoadPopover` into separate components |
| `factions/editor/FactionEditor.tsx` | `FactionEditForm` (local) | Sub-view | Inner form element wrapper with submit handler | None (co-located with orchestrator) | Keep local |
| `factions/editor/FactionSheetPreviewIframe.tsx` | `FactionSheetPreviewIframe` | UI concern | Iframe container with postMessage-based preview protocol | **DD-008**: no story | Add story demonstrating iframe preview |
| `factions/FactionList.tsx` | `FactionList` | UI concern | Responsive grid of faction cards | **DD-003**: `FactionList.module.css` `.name` uses margin; **DD-008**: no story | Replace margin with gap in parent; add story |
| `factions/FactionList.tsx` | `FactionListItem` (local) | UI concern | Single faction card with token + name | None (well-scoped local) | Keep local |
| `factions/sheet/FactionSheetView.tsx` | `FactionSheetView` | Sub-view | Thin wrapper rendering `FactionSheet` from game assets | None | No action needed |
| `faq/Answer.tsx` | `Answer.List` | UI concern | Compound-component answer list container | **DD-008**: no story | Add story |
| `faq/Answer.tsx` | `Answer.Item` | UI concern | Single answer item with accepted-state styling | **DD-008**: no story | Add story (in same file as Answer.List) |
| `faq/FaqItemList.tsx` | `FaqItemList` | UI concern | FAQ thread list shell (grid layout) | **DD-008**: no story | Add story |
| `faq/FaqItemList.tsx` | `FaqItemListRow` | UI concern | FAQ thread list row with metadata slots | **DD-008**: no story | Add story (in same file as FaqItemList) |
| `faq/FaqList.tsx` | `FaqList` | Sub-view | FAQ list with Fuse.js search and filtering | **DD-003**: `FaqList.module.css` uses margin on `.question`, `.parentQuestion`, `.answerPreview` | Replace leaf margins with gap-based parent wrappers |
| `form/ColorLayerField.tsx` | `ColorLayerField` | UI concern | Color + gradient layer picker field | None | ✅ Compliant (has story) |
| `form/ColorLayerField.tsx` | `GradientEditor` (local) | UI concern | Gradient stop list with add/remove controls | **DD-001**: duplicated in `FactionFormFields.tsx` | Consolidate into one shared `GradientEditor` |
| `form/FormActions.tsx` | `FormActions` | UI concern | Flex container for form action buttons | **DD-008**: no dedicated story | Add story or include in FormButton stories |
| `form/FormButton.tsx` | `FormButton` | UI concern | Styled button with semantic variants (primary/secondary/danger) | **DD-008**: no story | Add story with all variants |
| `form/FormField.tsx` | `FormField` | UI concern | Form field wrapper with label, hint, and error | **DD-008**: no story | Add story |
| `form/FormPopover.tsx` | `FormPopover` | UI concern | Radix Popover with consistent styling | **DD-008**: no story | Add story |
| `form/FormTabs.tsx` | `FormTabs` | UI concern | Radix Tabs wrapper with icon support | **DD-008**: no story | Add story |
| `form/FormTabs.tsx` | `FormTabsPanel` | UI concern | Tab panel content container | **DD-008**: no story | Add story (in same file as FormTabs) |
| `form/FormTooltip.tsx` | `FormTooltip` | UI concern | Radix Tooltip with consistent positioning | **DD-008**: no story | Add story |
| `form/FormUnitToolbar.tsx` | `FormUnitToolbar` | UI concern | 3-slot toolbar layout for form units | **DD-008**: no story | Add story |
| `form/HexColorPicker.tsx` | `HexColorPicker` | UI concern | Color swatch + hex text input using react-colorful | None | ✅ Compliant (has story) |
| `form/MultilineTextField.tsx` | `MultilineTextField` | UI concern | Textarea primitive sharing TextField styling | None | ✅ Compliant (has story) |
| `form/OptionPicker.tsx` | `OptionPicker` | UI concern | Radix Select dropdown wrapper | None | ✅ Compliant (has story) |
| `form/PrefixedField.tsx` | `PrefixedField` | UI concern | Prefix + input + suffix layout container | **DD-008**: no story | Add story |
| `form/SuggestField.tsx` | `SuggestField` | UI concern | Combobox with autocomplete, keyboard nav, and preview portal | **DD-009**: 527 lines (borderline; justified by combobox complexity) | Consider extracting `SuggestFieldOptionList` portal; low priority |
| `form/TextField.tsx` | `TextField` | UI concern | Input primitive with appearance variants | None | ✅ Compliant (has story) |
| `generic/layout/Stack.tsx` | `Stack` | UI concern | Vertical flex layout with gap tokens | **DD-008**: no story (though simple) | Add story; this is the DD-003 exemplar |
| `generic/layout/Toolbar.tsx` | `Toolbar` | UI concern | 3-slot compound toolbar (Left/Center/Right) | None | ✅ Compliant (has story) |
| `generic/layout/Toolbar.tsx` | `Left` (local) | UI concern | Toolbar left slot | None | Keep as compound sub-component |
| `generic/layout/Toolbar.tsx` | `Center` (local) | UI concern | Toolbar center slot | None | Keep as compound sub-component |
| `generic/layout/Toolbar.tsx` | `Right` (local) | UI concern | Toolbar right slot | None | Keep as compound sub-component |
| `generic/ui/IconButton.tsx` | `IconButton` | UI concern | Polymorphic icon button with semantic variants | None | ✅ Compliant (has story; DD-002/DD-005 exemplar) |
| `generic/ui/IconButton.tsx` | `IconButtonLink` | UI concern | Icon button rendered as a router Link | None | ✅ Compliant |
| `generic/surfaces/Block.tsx` | `Block` | UI concern | Card/block surface container | **DD-004**: uses string concat instead of clsx for className | Use `clsx(styles.block, className)` |
| `generic/surfaces/Block.tsx` | `BlockLink` | UI concern | Block surface rendered as a router Link | None | ✅ Compliant |
| `generic/surfaces/BlockCover.tsx` | `BlockCover` | UI concern | Image or placeholder cover for Block | **DD-008**: no story | Add story |
| `generic/surfaces/Card.tsx` | `Card` | UI concern | Card container with optional header | None | ✅ Compliant (has story) |
| `auth/LoginForm.tsx` | `LoginForm` | Sub-view | Authentication form with provider buttons | **DD-010**: placement ambiguous (auth-specific form in `auth/` vs `form/`) | Clarify convention: `auth/` is acceptable for domain-coupled forms |
| `profile/ProfileLink.tsx` | `ProfileLink` | UI concern | Linked profile name with avatar | **DD-008**: no story | Add story |
| `profile/ProfileSettingsForm.tsx` | `ProfileSettingsForm` | Sub-view | Profile settings edit form with save/navigate | **DD-008**: no story | Add story if generic patterns emerge |
| `profile/ProfileSettingsForm.tsx` | `ProfileSettingsFormFields` (local) | Sub-view | Inner form fields and handlers | None (co-located) | Keep local |
| `profile/ProfileFaqActivity.tsx` | `ProfileFaqQuestionsAsked` | Sub-view | List of FAQ questions asked by this profile | **DD-008**: no story | Add story |
| `profile/ProfileFaqActivity.tsx` | `ProfileFaqAnswersGiven` | Sub-view | List of FAQ answers given by this profile | **DD-008**: no story | Add story |
| `profile/ProfileFaqActivity.tsx` | `AskerChip` (local) | UI concern | Conditional profile link or "Your question" label | None (well-scoped local) | Keep local |

---

## Component Audit Table — `src/app/routes/`

Route components are inherently sub-views (they wire domain components into pages). They are not expected to satisfy DD-008 (stories) or DD-009 (small composable) the same way generic components are. Key violations are still flagged.

| File | Component | Classification | UI Concern / Purpose | Violations | Recommended Resolution |
|------|-----------|---------------|---------------------|------------|----------------------|
| `__root.tsx` | `NotFound` | Sub-view | 404 page content | None | No action |
| `__root.tsx` | `RootDocument` | Sub-view | HTML document shell with providers | None | No action |
| `_app.tsx` | `AppLayout` | Sub-view | Authenticated app layout wrapper | None | No action |
| `_app/index.tsx` | `IndexHead` | Sub-view | Home page meta head | None | No action |
| `_app/index.tsx` | `IndexPage` | Sub-view | Home page content | None | No action |
| `_app/admin/migrations.tsx` | `AdminMigrationsPage` | Sub-view | Admin migrations dashboard | None | No action |
| `_app/assets/create.tsx` | `CreateAssetsPage` | Sub-view | Asset creation page | None | No action |
| `_app/assets/index.tsx` | `AssetsPage` | Sub-view | Assets listing page | None | No action |
| `_app/factions/index.tsx` | `FactionsPage` | Sub-view | Factions listing page | None | No action |
| `_app/factions/create.tsx` | `CreateFactionPage` | Sub-view | Faction creation page | None | No action |
| `_app/factions/mine.tsx` | `FactionsMinePage` | Sub-view | My factions page | None | No action |
| `_app/factions/mine.tsx` | `FactionsOwnedList` (local) | Sub-view | Owned factions list chunk | **DD-009**: sub-view without clear reusable concern | Keep local; acceptable as page-scoped decomposition |
| `_app/factions/mine.tsx` | `FactionsByGroupsList` (local) | Sub-view | Group-organized factions list chunk | **DD-009**: sub-view without clear reusable concern | Keep local; acceptable as page-scoped decomposition |
| `_app/factions/mine.tsx` | `GroupFactions` (local) | Sub-view | Single group's factions sub-list | **DD-009**: sub-view without clear reusable concern | Keep local; acceptable as page-scoped decomposition |
| `_app/factions/$factionId.tsx` | `FactionPageHead` | Sub-view | Faction detail page meta head | None | No action |
| `_app/factions/$factionId.tsx` | `FactionDetailPage` | Sub-view | Faction detail page content | None | No action |
| `_app/factions/$factionId/edit.tsx` | `FactionEditPage` | Sub-view | Faction edit page wrapper | None | No action |
| `_app/factions/$factionId/sheet.tsx` | `FactionSheetPage` | Sub-view | Faction sheet page wrapper | None | No action |
| `_app/groups/create.tsx` | `GroupCreatePage` | Sub-view | Group creation page | None | No action |
| `_app/groups/$groupSlug.tsx` | `GroupPageHead` | Sub-view | Group detail page meta head | None | No action |
| `_app/groups/$groupSlug.tsx` | `GroupDetailPage` | Sub-view | Group detail page content | None | No action |
| `_app/profiles/index.tsx` | `ProfilesPage` | Sub-view | Profiles listing page | None | No action |
| `_app/profiles/settings.tsx` | `ProfileSettingsPageHead` | Sub-view | Settings page meta head | None | No action |
| `_app/profiles/settings.tsx` | `ProfileSettingsPage` | Sub-view | Settings page content | None | No action |
| `_app/profiles/$slug.tsx` | `ProfilePageHead` | Sub-view | Profile detail page meta head | None | No action |
| `_app/profiles/$slug.tsx` | `ProfileDetailPage` | Sub-view | Profile detail page content | None | No action |
| `_app/rulesets/index.tsx` | `RulesetsPage` | Sub-view | Rulesets listing page | None | No action |
| `_app/rulesets/create.tsx` | `CreateRulesetPage` | Sub-view | Ruleset creation page | None | No action |
| `_app/rulesets/$rulesetSlug.tsx` | `RulesetDetailPage` | Sub-view | Ruleset detail page | None | No action |
| `_app/rulesets/$rulesetSlug/faq/create.tsx` | `FaqCreatePage` | Sub-view | FAQ question creation page | None | No action |
| `_app/rulesets/$rulesetSlug/faq/$questionSlug.tsx` | `FaqDetailPage` | Sub-view | FAQ question detail page | None | No action |
| `auth/index.tsx` | `App` | Sub-view | Auth layout wrapper | None | No action |
| `auth/login.tsx` | `Login` | Sub-view | Login page content | None | No action |
| `auth/error.tsx` | `AuthError` | Sub-view | Auth error page | None | No action |
| `privacy/index.tsx` | `RouteComponent` | Sub-view | Privacy policy page | None | No action |

---

## Violation Summary

| Decision | # Violations | Affected Components |
|----------|-------------|-------------------|
| **DD-001** Reuse shared first | 2 | `IconActionButton` (duplicates composition), `GradientEditor` in FactionFormFields (duplicated) |
| **DD-002** Layer direction | 1 critical | `Page` + `AuthNav` import from `@db/profiles` |
| **DD-003** Spacing via gap | 3 | `FactionList.module.css`, `FaqList.module.css`, margin in leaf controls |
| **DD-004** No custom CSS | 2 | `Page.tsx` (non-module CSS), `Block.tsx` (string concat vs clsx) |
| **DD-005** Icon-only a11y | 0 | All compliant ✅ |
| **DD-006** Toolbar primary action | 0 | All compliant ✅ |
| **DD-007** Button color intent | 0 | All compliant ✅ |
| **DD-008** Stories required | 17 | FormButton, FormField, FormPopover, FormTabs, FormTooltip, FormUnitToolbar, PrefixedField, FormActions, Stack, Block, BlockCover, FactionList, FactionSheetPreviewIframe, Answer, FaqItemList, ProfileLink, ProfileFaqActivity |
| **DD-009** Small composable | 3 | `FactionFormFields` (1685 lines), `FactionEditor` (604 lines), `SuggestField` (527 lines, borderline) |
| **DD-010** Correct placement | 1 advisory | `LoginForm` placement in `auth/` vs `form/` |
| **DD-011** One canonical path | 0 | All compliant ✅ |

---

## Priority Actions

### 🔴 Critical
1. **`Page.tsx` — DD-002 layer violation**: Remove `useCurrentProfile` import from generic surface; extract `AuthNav` to profile domain or accept as slot prop
2. **`FactionFormFields.tsx` — DD-009 monolith**: Decompose 1685-line file into focused components
3. **`Page.tsx` — DD-004 non-module CSS**: Merge `Page.css` into `Page.module.css`

### 🟠 High Priority
4. **DD-008 — 17 generic components missing stories**: Prioritize `form/` components (8 missing), then `generic/` (3 missing), then domain (6 missing)
5. **Duplicate `GradientEditor`**: Consolidate the two implementations (in `ColorLayerField.tsx` and `FactionFormFields.tsx`) into one shared component

### 🟡 Medium Priority
6. **DD-003 margin audit**: Replace leaf-level margins in `FactionList.module.css` and `FaqList.module.css` with gap-based parent wrappers
7. **`FactionEditor.tsx` — DD-009**: Extract popover logic into separate components (604 lines)
8. **`Block.tsx` — DD-004**: Replace string concat with `clsx()` for className composition
9. **`LoginForm` placement**: Document whether `auth/` is an acceptable domain folder for auth-specific forms
