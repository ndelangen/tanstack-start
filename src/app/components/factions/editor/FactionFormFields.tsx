import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactFormExtendedApi } from '@tanstack/react-form';
import clsx from 'clsx';
import {
  CircleOff,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Rotate3d,
  Trash2,
} from 'lucide-react';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import type { Faction } from '@db/factions';
import {
  FormButton,
  FormField,
  FormPopover,
  FormTabs,
  FormTooltip,
  FormUnitToolbar,
  HexColorPicker,
  MultilineTextField,
  OptionPicker,
  PrefixedField,
  TextField,
} from '@app/components/generic/form';
import { DECAL, GENERIC, ICON, LEADERS, LOGO, TROOP, TROOP_MODIFIER } from '@game/data/generated';
import { TTSColor } from '@game/schema/faction';

import { AssetAutocomplete as TypeSuggestPicker } from './AssetAutocomplete';
import { BackgroundColorSlot as ColorPicker } from './BackgroundColorSlot';
import styles from './FactionEditor.module.css';
import { type FactionEditorSectionId, useEditorAccordionHash } from './useEditorAccordionHash';

const NONE_SELECT_VALUE = '__none__';
/** `useForm` with no custom form-level validators — matches default `ReactFormExtendedApi` slots. */
type DefaultReactFormApi<TFormData> = ReactFormExtendedApi<
  TFormData,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
>;

export type FactionFormApi = DefaultReactFormApi<Faction>;

const DECAL_OFFSET_MIN = -500;
const DECAL_OFFSET_MAX = 500;
const PREVIEWABLE_EXT = /\.(svg|png|jpg|jpeg)$/i;
const ACCORDION_SECTION_ICON_SRC: Partial<Record<FactionEditorSectionId, string>> = {
  identity: '/vector/icon/eye.svg',
  hero: '/vector/generic/ceasar.svg',
  leaders: '/vector/icon/traitor.svg',
  decals: '/vector/icon/alliance.svg',
  troops: '/vector/troop/atreides.svg',
  rules: '/vector/icon/balance.svg',
  advantages: '/vector/icon/kwisatz.svg',
};

function isPreviewableAssetPath(path: string): boolean {
  return PREVIEWABLE_EXT.test(path.trim());
}

function assetPathToPublicUrl(path: string): string {
  const p = path.trim().replace(/^\/+/, '');
  return `/${p}`;
}

function clampDecalOffset(n: number): number {
  return Math.min(DECAL_OFFSET_MAX, Math.max(DECAL_OFFSET_MIN, n));
}

function DecalOffsetAxisSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const raw = Number(value);
  const rounded = Number.isFinite(raw) ? Math.round(raw) : 0;
  const clamped = clampDecalOffset(rounded);

  useLayoutEffect(() => {
    if (rounded !== clamped) onChange(clamped);
  }, [rounded, clamped, onChange]);

  return (
    <label className={styles.sliderLabel} htmlFor={id}>
      {label}
      <span className={styles.sliderValue}>{clamped}</span>
      <input
        id={id}
        className={styles.rangeInput}
        type="range"
        min={DECAL_OFFSET_MIN}
        max={DECAL_OFFSET_MAX}
        step={1}
        value={clamped}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
      />
    </label>
  );
}

function IconActionButton({
  label,
  variant = 'secondary',
  children,
  ...props
}: ComponentPropsWithoutRef<typeof FormButton> & { label: string }) {
  return (
    <FormTooltip content={label}>
      <FormButton {...props} variant={variant} iconOnly aria-label={label}>
        {children}
      </FormButton>
    </FormTooltip>
  );
}

type SortableHandleProps = Pick<
  ReturnType<typeof useSortable>,
  'setActivatorNodeRef' | 'attributes' | 'listeners'
>;

function ReorderHandleButton({
  label,
  className,
  setActivatorNodeRef,
  attributes,
  listeners,
}: {
  label: string;
  className?: string;
  setActivatorNodeRef?: SortableHandleProps['setActivatorNodeRef'];
  attributes?: SortableHandleProps['attributes'];
  listeners?: SortableHandleProps['listeners'];
}) {
  return (
    <FormTooltip content={label} side="left" align="center" collisionPadding={12}>
      <button
        type="button"
        className={clsx(styles.reorderHandleButton, className)}
        aria-label={label}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden />
      </button>
    </FormTooltip>
  );
}

function getSortableIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`);
}

function indexFromSortableId(id: string | number, prefix: string): number | null {
  if (typeof id !== 'string' || !id.startsWith(prefix)) return null;
  const parsed = Number.parseInt(id.slice(prefix.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function SortableCard({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (args: SortableHandleProps) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });
  const { active } = useDndContext();
  const shouldApplyMotion = active != null || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: shouldApplyMotion ? CSS.Transform.toString(transform) : undefined,
        transition: shouldApplyMotion ? transition : undefined,
      }}
      className={clsx(
        className,
        isDragging && styles.sortableItemDragging,
        isOver && !isDragging && styles.sortableItemDropTarget
      )}
    >
      {children({ setActivatorNodeRef, attributes, listeners })}
    </div>
  );
}

function SortableTtsRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (args: SortableHandleProps) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });
  const { active } = useDndContext();
  const shouldApplyMotion = active != null || isDragging;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: shouldApplyMotion ? CSS.Transform.toString(transform) : undefined,
        transition: shouldApplyMotion ? transition : undefined,
      }}
      className={clsx(
        className,
        isDragging && styles.sortableItemDragging,
        isOver && !isDragging && styles.sortableItemDropTarget
      )}
    >
      {children({ setActivatorNodeRef, attributes, listeners })}
    </li>
  );
}

const logoOptions = [...LOGO.options, ...GENERIC.options] as readonly string[];

/** Decal `id` is `ALL` in schema; picker focuses on paths used on alliance cards. */
const decalAssetOptions = [
  ...new Set([...DECAL.options, ...ICON.options, ...LOGO.options, ...GENERIC.options]),
].sort((a, b) => a.localeCompare(b)) as readonly string[];

function toTitleCaseWord(word: string): string {
  if (word.length === 0) return '';
  return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
}

function longestCommonPrefix(values: readonly string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0] ?? '';
  for (let i = 1; i < values.length; i += 1) {
    const value = values[i] ?? '';
    let j = 0;
    const max = Math.min(prefix.length, value.length);
    while (j < max && prefix[j] === value[j]) j += 1;
    prefix = prefix.slice(0, j);
    if (prefix.length === 0) break;
  }
  const lastSlash = prefix.lastIndexOf('/');
  return lastSlash >= 0 ? prefix.slice(0, lastSlash + 1) : '';
}

function formatPathDisplay(rawValue: string, commonPrefix: string): string {
  const raw = rawValue.trim();
  if (raw.length === 0) return rawValue;
  const withoutPrefix = raw.startsWith(commonPrefix) ? raw.slice(commonPrefix.length) : raw;
  const withoutExt = withoutPrefix.replace(/\.[^./]+$/u, '');
  const parts = withoutExt
    .split('/')
    .map((segment) =>
      segment
        .split(/[-_]+/u)
        .map((word) => toTitleCaseWord(word))
        .join(' ')
    )
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' - ') : rawValue;
}

function createPathOptionLabeler(options: readonly string[]): (raw: string) => string {
  const commonPrefix = longestCommonPrefix(options);
  return (raw) => formatPathDisplay(raw, commonPrefix);
}

const logoOptionToLabel = createPathOptionLabeler(logoOptions);
const decalAssetOptionToLabel = createPathOptionLabeler(decalAssetOptions);
const leaderOptionToLabel = createPathOptionLabeler(LEADERS.options);
const troopOptionToLabel = createPathOptionLabeler(TROOP.options);
const troopStarOptionToLabel = createPathOptionLabeler(TROOP_MODIFIER.options);

const defaultLeader = (): Faction['leaders'][number] => ({
  name: '',
  strength: '1',
  image: LEADERS.options[0],
});

function nextStrengthChar(value: Faction['leaders'][number]['strength']): string {
  const raw =
    value === undefined || value === null ? '' : typeof value === 'number' ? String(value) : value;
  const ch = raw.trim().slice(-1);
  if (ch.length === 0) return '1';

  if (/^[0-9]$/u.test(ch)) {
    return ch === '9' ? '0' : String.fromCharCode(ch.charCodeAt(0) + 1);
  }

  if (/^[a-z]$/u.test(ch)) {
    return ch === 'z' ? 'a' : String.fromCharCode(ch.charCodeAt(0) + 1);
  }

  if (/^[A-Z]$/u.test(ch)) {
    return ch === 'Z' ? 'A' : String.fromCharCode(ch.charCodeAt(0) + 1);
  }

  return '1';
}

function nextLeaderImage(
  image: Faction['leaders'][number]['image']
): Faction['leaders'][number]['image'] {
  const total = LEADERS.options.length;
  if (total === 0) return LEADERS.options[0] as Faction['leaders'][number]['image'];
  const idx = LEADERS.options.indexOf(image);
  if (idx < 0) return LEADERS.options[0];
  return LEADERS.options[(idx + 1) % total];
}

function nextLeaderFromLast(
  last: Faction['leaders'][number] | undefined
): Faction['leaders'][number] {
  if (last == null) return defaultLeader();
  return {
    name: 'new leader',
    strength: nextStrengthChar(last.strength),
    image: nextLeaderImage(last.image),
  };
}

const defaultDecal = (): Faction['decals'][number] => ({
  id: DECAL.options[0],
  muted: false,
  outline: false,
  scale: 0.5,
  offset: [0, 0],
});

const defaultTroop = (): Faction['troops'][number] => ({
  name: '',
  image: TROOP.options[0],
  description: '',
  count: 20,
});

const troopStarOptions = [
  { value: NONE_SELECT_VALUE, label: 'None' },
  ...TROOP_MODIFIER.options.map((opt) => ({
    value: opt,
    label: troopStarOptionToLabel(opt),
  })),
] as const;

function createTroopBackFromFront(
  front: Faction['troops'][number]
): NonNullable<Faction['troops'][number]['back']> {
  return {
    name: front.name,
    image: front.image,
    description: front.description,
    star: front.star,
    striped: front.striped === true ? undefined : true,
  };
}

function TroopSideFields({
  form,
  troopIndex,
  side,
}: {
  form: FactionFormApi;
  troopIndex: number;
  side: 'front' | 'back';
}) {
  const isBack = side === 'back';
  const idBase = isBack ? `troop-${troopIndex}-back` : `troop-${troopIndex}`;
  const imageLabel = isBack ? 'Back image' : 'Troop image';
  const descriptionLabel = isBack ? 'Back description' : 'Description';
  const starLabel = isBack ? 'Back star modifier' : 'Star modifier';
  const stripedLabel = isBack ? 'Back striped pattern' : 'Striped pattern';

  const i = troopIndex;
  const nameField = isBack ? (`troops[${i}].back.name` as const) : (`troops[${i}].name` as const);
  const imageField = isBack
    ? (`troops[${i}].back.image` as const)
    : (`troops[${i}].image` as const);
  const descField = isBack
    ? (`troops[${i}].back.description` as const)
    : (`troops[${i}].description` as const);
  const starField = isBack ? (`troops[${i}].back.star` as const) : (`troops[${i}].star` as const);
  const stripedField = isBack
    ? (`troops[${i}].back.striped` as const)
    : (`troops[${i}].striped` as const);

  return (
    <div className={styles.troopSideFields}>
      <div className={styles.arrayCardGrid}>
        <form.Field name={nameField}>
          {(field) => (
            <FormField label={isBack ? 'Back name' : 'Name'} htmlFor={`${idBase}-name`}>
              <TextField
                id={`${idBase}-name`}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={imageField}>
          {(field) => (
            <TypeSuggestPicker
              id={`${idBase}-img`}
              label={imageLabel}
              value={field.state.value ?? ''}
              onChange={(v) => field.handleChange(v as Faction['troops'][number]['image'])}
              options={TROOP.options}
              optionToLabel={troopOptionToLabel}
            />
          )}
        </form.Field>
        <form.Field name={descField}>
          {(field) => (
            <FormField label={descriptionLabel} htmlFor={`${idBase}-desc`}>
              <MultilineTextField
                id={`${idBase}-desc`}
                rows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={starField}>
          {(field) => (
            <FormField label={starLabel}>
              <OptionPicker
                ariaLabel={`${starLabel} for troop ${troopIndex + 1}`}
                value={field.state.value ?? NONE_SELECT_VALUE}
                onValueChange={(next) =>
                  field.handleChange(
                    next === NONE_SELECT_VALUE
                      ? undefined
                      : (next as NonNullable<Faction['troops'][number]['star']>)
                  )
                }
                options={troopStarOptions}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={stripedField}>
          {(field) => (
            <FormField label={stripedLabel} htmlFor={`${idBase}-striped`}>
              <input
                id={`${idBase}-striped`}
                type="checkbox"
                className={styles.checkbox}
                checked={field.state.value === true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked ? true : undefined)}
              />
            </FormField>
          )}
        </form.Field>
      </div>
    </div>
  );
}

const defaultAdvantage = (): Faction['rules']['advantages'][number] => ({
  text: '',
});

function AccordionSection({
  id,
  title,
  icon,
  isOpen,
  onOpen,
  children,
}: {
  id: FactionEditorSectionId;
  title: string;
  icon?: ReactNode;
  isOpen: boolean;
  onOpen: (section: FactionEditorSectionId) => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.accordionItem}>
      <button
        type="button"
        className={styles.accordionHeader}
        aria-expanded={isOpen}
        aria-controls={`faction-panel-${id}`}
        id={`faction-header-${id}`}
        onClick={() => onOpen(id)}
      >
        <span className={styles.accordionHeaderMain}>
          {icon != null && <span className={styles.accordionHeaderIcon}>{icon}</span>}
          <span className={styles.accordionHeaderTitle}>{title}</span>
        </span>
        <span className={styles.accordionHeaderChevron} aria-hidden>
          ▾
        </span>
      </button>
      {isOpen && (
        <section
          className={styles.accordionPanel}
          id={`faction-panel-${id}`}
          aria-labelledby={`faction-header-${id}`}
        >
          {children}
        </section>
      )}
    </div>
  );
}

function renderAccordionIcon(sectionId: FactionEditorSectionId): ReactNode {
  const src = ACCORDION_SECTION_ICON_SRC[sectionId];
  if (src == null) {
    if (sectionId === 'background') return <ImageIcon size={15} aria-hidden />;
    return null;
  }
  return (
    <img
      className={styles.accordionHeaderIconImage}
      src={src}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}

function optionsForSlot(value: Faction['colors'], slotIndex: number): Faction['colors'][number][] {
  const current = value[slotIndex];
  return TTSColor.options.filter(
    (opt) => opt === current || !value.some((v, j) => j !== slotIndex && v === opt)
  ) as Faction['colors'][number][];
}

function firstUnusedColor(value: Faction['colors']): Faction['colors'][number] | undefined {
  return TTSColor.options.find((opt) => !value.includes(opt as Faction['colors'][number])) as
    | Faction['colors'][number]
    | undefined;
}

function TtsColorsEditor({
  value,
  onChange,
}: {
  value: Faction['colors'];
  onChange: (next: Faction['colors']) => void;
}) {
  const sortablePrefix = 'tts-';
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const itemIds = useMemo(() => value.map((slotColor) => `${sortablePrefix}${slotColor}`), [value]);

  return (
    <FormField label="TTS colors (ordered)">
      <p className={styles.ttsHint}>
        <strong>Order is essential</strong> for Tabletop Simulator: the first entry is the primary
        tone, the second is next, and so on. Drag the handle on the left to reorder. Each color can
        appear only once.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }: DragEndEvent) => {
          if (!over) return;
          const activeId = typeof active.id === 'string' ? active.id : String(active.id);
          const overId = typeof over.id === 'string' ? over.id : String(over.id);
          const fromIndex = itemIds.indexOf(activeId);
          const toIndex = itemIds.indexOf(overId);
          const from = fromIndex >= 0 ? fromIndex : null;
          const to = toIndex >= 0 ? toIndex : null;
          if (from == null || to == null || from === to) return;
          const next = arrayMove(value, from, to);
          onChange(next);
        }}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ul className={styles.ttsList}>
            {value.map((c, i) => {
              const itemId = itemIds[i] ?? `${sortablePrefix}missing-${i}`;
              return (
                <SortableTtsRow key={itemId} id={itemId} className={styles.ttsRow}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <PrefixedField
                      className={styles.ttsRowControl}
                      prefix={
                        <div className={styles.ttsPrefixContent}>
                          <ReorderHandleButton
                            label={`Drag to reorder slot ${i + 1}`}
                            className={styles.ttsDragHandle}
                            setActivatorNodeRef={setActivatorNodeRef}
                            attributes={attributes}
                            listeners={listeners}
                          />
                        </div>
                      }
                      suffixClassName={styles.ttsRowActions}
                      suffix={
                        <FormTooltip content={`Remove TTS color slot ${i + 1}`}>
                          <FormButton
                            type="button"
                            variant="danger"
                            iconOnly
                            className={styles.ttsRemoveButton}
                            aria-label={`Remove TTS color slot ${i + 1}`}
                            onClick={() => onChange(value.filter((_, j) => j !== i))}
                          >
                            <Trash2 size={16} strokeWidth={2} aria-hidden />
                          </FormButton>
                        </FormTooltip>
                      }
                    >
                      <OptionPicker
                        ariaLabel={`TTS color slot ${i + 1}`}
                        value={c}
                        onValueChange={(picked) => {
                          const nextPicked = picked as Faction['colors'][number];
                          if (value.some((v, j) => j !== i && v === nextPicked)) return;
                          const next = [...value];
                          next[i] = nextPicked;
                          onChange(next);
                        }}
                        options={optionsForSlot(value, i).map((opt) => ({
                          value: opt,
                          label: opt,
                        }))}
                        triggerClassName={styles.ttsSelectTrigger}
                      />
                    </PrefixedField>
                  )}
                </SortableTtsRow>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <FormTooltip content="Add color at the end">
        <FormButton
          type="button"
          variant="secondary"
          iconOnly
          aria-label="Add color at the end"
          disabled={firstUnusedColor(value) == null}
          onClick={() => {
            const add = firstUnusedColor(value);
            if (add) onChange([...value, add]);
          }}
        >
          <Plus size={16} aria-hidden />
        </FormButton>
      </FormTooltip>
    </FormField>
  );
}

export function FactionFormFields({ form }: { form: FactionFormApi }) {
  const { openId, openSection } = useEditorAccordionHash();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [pendingLeaderFocusId, setPendingLeaderFocusId] = useState<string | null>(null);
  const [troopSideTabByIndex, setTroopSideTabByIndex] = useState<Record<number, 'front' | 'back'>>(
    {}
  );

  useLayoutEffect(() => {
    if (pendingLeaderFocusId == null) return;
    if (typeof document !== 'undefined') {
      const target = document.getElementById(pendingLeaderFocusId);
      if (target instanceof HTMLInputElement) {
        target.focus();
        target.select();
      }
    }
    setPendingLeaderFocusId(null);
  }, [pendingLeaderFocusId]);

  return (
    <div className={styles.formColumn}>
      <AccordionSection
        id="identity"
        title="Identity"
        icon={renderAccordionIcon('identity')}
        isOpen={openId === 'identity'}
        onOpen={openSection}
      >
        <form.Field name="name">
          {(field) => (
            <>
              <FormField label="Display name" htmlFor="faction-name">
                <TextField
                  id="faction-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormField>
              <p className={styles.ttsHint}>
                The display name sets your faction&apos;s public slug, which appears in the
                shareable URL. If you rename an existing faction, that slug (and the URL) can
                change, so older links may break—including bookmarks, pasted links, and references
                in Tabletop Simulator.
              </p>
            </>
          )}
        </form.Field>
        <form.Field name="logo">
          {(field) => (
            <TypeSuggestPicker
              id="faction-logo"
              label="Logo"
              value={field.state.value}
              onChange={(v) => field.handleChange(v as Faction['logo'])}
              options={logoOptions}
              optionToLabel={logoOptionToLabel}
            />
          )}
        </form.Field>
        <form.Field name="themeColor">
          {(field) => (
            <FormField label="Theme color (#rrggbb)" htmlFor="faction-theme-text">
              <HexColorPicker
                pickerId="faction-theme-picker"
                textId="faction-theme-text"
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                onBlur={field.handleBlur}
                pickerAriaLabel="Pick theme color"
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="colors">
          {(field) => <TtsColorsEditor value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="background"
        title="Background"
        icon={renderAccordionIcon('background')}
        isOpen={openId === 'background'}
        onOpen={openSection}
      >
        <form.Field name="background.image">
          {(field) => (
            <FormField label="Background texture image" htmlFor="bg-image">
              <div className={styles.assetInputRow}>
                <TextField
                  id="bg-image"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {isPreviewableAssetPath(field.state.value) && (
                  <FormPopover
                    trigger={
                      <FormButton
                        type="button"
                        variant="secondary"
                        iconOnly
                        aria-label="Preview image"
                      >
                        <Eye size={16} aria-hidden />
                      </FormButton>
                    }
                  >
                    <img
                      className={styles.assetPreviewImage}
                      src={assetPathToPublicUrl(field.state.value)}
                      alt=""
                      draggable={false}
                    />
                  </FormPopover>
                )}
              </div>
            </FormField>
          )}
        </form.Field>
        <form.Field name="background.colors[0]">
          {(field) => (
            <ColorPicker
              legend="Background layer A"
              idPrefix="bg-a"
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="background.colors[1]">
          {(field) => (
            <ColorPicker
              legend="Background layer B"
              idPrefix="bg-b"
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="background.strength">
          {(field) => (
            <label className={styles.sliderLabel} htmlFor="bg-strength">
              Background strength (0–1)
              <span className={styles.sliderValue}>{field.state.value.toFixed(2)}</span>
              <input
                id="bg-strength"
                className={styles.rangeInput}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number.parseFloat(e.target.value) || 0)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="background.opacity">
          {(field) => (
            <label className={styles.sliderLabel} htmlFor="bg-opacity">
              Background opacity (0–1)
              <span className={styles.sliderValue}>{field.state.value.toFixed(2)}</span>
              <input
                id="bg-opacity"
                className={styles.rangeInput}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number.parseFloat(e.target.value) || 0)}
              />
            </label>
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="hero"
        title="Hero"
        icon={renderAccordionIcon('hero')}
        isOpen={openId === 'hero'}
        onOpen={openSection}
      >
        <form.Field name="hero.name">
          {(field) => (
            <FormField label="Hero name" htmlFor="hero-name">
              <TextField
                id="hero-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="hero.image">
          {(field) => (
            <TypeSuggestPicker
              id="hero-image"
              label="Hero image"
              value={field.state.value}
              onChange={(v) => field.handleChange(v as Faction['hero']['image'])}
              options={LEADERS.options}
              optionToLabel={leaderOptionToLabel}
            />
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="leaders"
        title="Leaders"
        icon={renderAccordionIcon('leaders')}
        isOpen={openId === 'leaders'}
        onOpen={openSection}
      >
        <form.Field name="leaders" mode="array">
          {(lf) => {
            const sortablePrefix = 'leaders-';
            const itemIds = getSortableIds(sortablePrefix, lf.state.value.length);
            return (
              <>
                {lf.state.value.length === 0 && (
                  <p className={styles.sectionIntro}>This faction has no leaders.</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }: DragEndEvent) => {
                    if (!over) return;
                    const from = indexFromSortableId(active.id, sortablePrefix);
                    const to = indexFromSortableId(over.id, sortablePrefix);
                    if (from == null || to == null || from === to) return;
                    lf.handleChange(arrayMove(lf.state.value, from, to));
                  }}
                >
                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {lf.state.value.map((_, i) => {
                      const itemId = `${sortablePrefix}${i}`;
                      return (
                        <SortableCard
                          key={itemId}
                          id={itemId}
                          className={clsx(styles.arrayCard, styles.arrayCardWithToolbar)}
                        >
                          {({ setActivatorNodeRef, attributes, listeners }) => (
                            <>
                              <FormUnitToolbar
                                leading={
                                  <ReorderHandleButton
                                    label={`Drag to reorder leader ${i + 1}`}
                                    setActivatorNodeRef={setActivatorNodeRef}
                                    attributes={attributes}
                                    listeners={listeners}
                                  />
                                }
                                actions={
                                  <IconActionButton
                                    type="button"
                                    label="Remove leader"
                                    variant="danger"
                                    onClick={() => lf.removeValue(i)}
                                  >
                                    <Trash2 size={16} aria-hidden />
                                  </IconActionButton>
                                }
                              />
                              <div className={styles.unitCardBody}>
                                <div className={styles.arrayCardGrid}>
                                  <form.Field name={`leaders[${i}].name`}>
                                    {(field) => (
                                      <FormField label="Name" htmlFor={`leader-${i}-name`}>
                                        <TextField
                                          id={`leader-${i}-name`}
                                          value={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                  <form.Field name={`leaders[${i}].strength`}>
                                    {(field) => (
                                      <FormField
                                        label="Strength"
                                        htmlFor={`leader-${i}-str`}
                                        hint="Usually one digit or letter (e.g. 5). Multiple digits are stored as a number. Leave empty to omit."
                                      >
                                        <TextField
                                          id={`leader-${i}-str`}
                                          inputMode="text"
                                          autoComplete="off"
                                          value={
                                            field.state.value === undefined ||
                                            field.state.value === null
                                              ? ''
                                              : String(field.state.value)
                                          }
                                          onBlur={field.handleBlur}
                                          onChange={(e) => {
                                            const raw = e.target.value.trim();
                                            if (raw === '') {
                                              field.handleChange(undefined);
                                              return;
                                            }
                                            if (/^\d+$/.test(raw)) {
                                              field.handleChange(Number.parseInt(raw, 10));
                                              return;
                                            }
                                            const ch = raw.slice(-1);
                                            if (raw.length === 1 && /^[a-z0-9]$/i.test(ch)) {
                                              field.handleChange(ch);
                                            }
                                          }}
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                  <form.Field name={`leaders[${i}].image`}>
                                    {(field) => (
                                      <TypeSuggestPicker
                                        id={`leader-${i}-img`}
                                        label="Image"
                                        value={field.state.value}
                                        onChange={(v) =>
                                          field.handleChange(
                                            v as Faction['leaders'][number]['image']
                                          )
                                        }
                                        options={LEADERS.options}
                                        optionToLabel={leaderOptionToLabel}
                                      />
                                    )}
                                  </form.Field>
                                </div>
                              </div>
                            </>
                          )}
                        </SortableCard>
                      );
                    })}
                  </SortableContext>
                </DndContext>
                <IconActionButton
                  type="button"
                  label="Add leader"
                  variant="secondary"
                  onClick={() => {
                    const newIndex = lf.state.value.length;
                    const last = lf.state.value[newIndex - 1];
                    lf.pushValue(nextLeaderFromLast(last));
                    setPendingLeaderFocusId(`leader-${newIndex}-name`);
                  }}
                >
                  <Plus size={16} aria-hidden />
                </IconActionButton>
              </>
            );
          }}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="decals"
        title="Alliance decals"
        icon={renderAccordionIcon('decals')}
        isOpen={openId === 'decals'}
        onOpen={openSection}
      >
        <p className={styles.sectionIntro}>
          Decorative artwork on the alliance card (placement, scale, and whether the art is muted or
          outlined).
        </p>
        <form.Field name="decals" mode="array">
          {(df) => {
            const sortablePrefix = 'decals-';
            const itemIds = getSortableIds(sortablePrefix, df.state.value.length);
            return (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }: DragEndEvent) => {
                    if (!over) return;
                    const from = indexFromSortableId(active.id, sortablePrefix);
                    const to = indexFromSortableId(over.id, sortablePrefix);
                    if (from == null || to == null || from === to) return;
                    df.handleChange(arrayMove(df.state.value, from, to));
                  }}
                >
                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {df.state.value.map((_, i) => {
                      const itemId = `${sortablePrefix}${i}`;
                      return (
                        <SortableCard
                          key={itemId}
                          id={itemId}
                          className={clsx(styles.arrayCard, styles.arrayCardWithToolbar)}
                        >
                          {({ setActivatorNodeRef, attributes, listeners }) => (
                            <>
                              <FormUnitToolbar
                                leading={
                                  <ReorderHandleButton
                                    label={`Drag to reorder decal ${i + 1}`}
                                    setActivatorNodeRef={setActivatorNodeRef}
                                    attributes={attributes}
                                    listeners={listeners}
                                  />
                                }
                                actions={
                                  <IconActionButton
                                    type="button"
                                    label="Remove decal"
                                    variant="danger"
                                    onClick={() => df.removeValue(i)}
                                  >
                                    <Trash2 size={16} aria-hidden />
                                  </IconActionButton>
                                }
                              />
                              <div className={styles.unitCardBody}>
                                <form.Field name={`decals[${i}].id`}>
                                  {(field) => (
                                    <TypeSuggestPicker
                                      id={`decal-${i}-id`}
                                      label="Decal asset"
                                      value={field.state.value}
                                      onChange={(v) =>
                                        field.handleChange(v as Faction['decals'][number]['id'])
                                      }
                                      options={decalAssetOptions}
                                      optionToLabel={decalAssetOptionToLabel}
                                    />
                                  )}
                                </form.Field>
                                <div className={styles.formRow}>
                                  <form.Field name={`decals[${i}].muted`}>
                                    {(field) => (
                                      <FormField label="Muted" htmlFor={`decal-${i}-muted`}>
                                        <input
                                          id={`decal-${i}-muted`}
                                          type="checkbox"
                                          className={styles.checkbox}
                                          checked={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) => field.handleChange(e.target.checked)}
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                  <form.Field name={`decals[${i}].outline`}>
                                    {(field) => (
                                      <FormField label="Outline" htmlFor={`decal-${i}-outline`}>
                                        <input
                                          id={`decal-${i}-outline`}
                                          type="checkbox"
                                          className={styles.checkbox}
                                          checked={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) => field.handleChange(e.target.checked)}
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                </div>
                                <form.Field name={`decals[${i}].scale`}>
                                  {(field) => (
                                    <label
                                      className={styles.sliderLabel}
                                      htmlFor={`decal-${i}-scale`}
                                    >
                                      Scale (0–1)
                                      <span className={styles.sliderValue}>
                                        {field.state.value.toFixed(2)}
                                      </span>
                                      <input
                                        id={`decal-${i}-scale`}
                                        className={styles.rangeInput}
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={field.state.value}
                                        onChange={(e) =>
                                          field.handleChange(Number.parseFloat(e.target.value) || 0)
                                        }
                                      />
                                    </label>
                                  )}
                                </form.Field>
                                <div className={styles.formRow}>
                                  <form.Field name={`decals[${i}].offset[0]`}>
                                    {(field) => (
                                      <DecalOffsetAxisSlider
                                        id={`decal-${i}-ox`}
                                        label="Offset X (−500–500)"
                                        value={field.state.value}
                                        onChange={(n) => field.handleChange(n)}
                                      />
                                    )}
                                  </form.Field>
                                  <form.Field name={`decals[${i}].offset[1]`}>
                                    {(field) => (
                                      <DecalOffsetAxisSlider
                                        id={`decal-${i}-oy`}
                                        label="Offset Y (−500–500)"
                                        value={field.state.value}
                                        onChange={(n) => field.handleChange(n)}
                                      />
                                    )}
                                  </form.Field>
                                </div>
                              </div>
                            </>
                          )}
                        </SortableCard>
                      );
                    })}
                  </SortableContext>
                </DndContext>
                <IconActionButton
                  type="button"
                  label="Add decal"
                  variant="secondary"
                  onClick={() => df.pushValue(defaultDecal())}
                >
                  <Plus size={16} aria-hidden />
                </IconActionButton>
              </>
            );
          }}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="troops"
        title="Troops"
        icon={renderAccordionIcon('troops')}
        isOpen={openId === 'troops'}
        onOpen={openSection}
      >
        <form.Field name="troops" mode="array">
          {(tf) => {
            const sortablePrefix = 'troops-';
            const itemIds = getSortableIds(sortablePrefix, tf.state.value.length);
            return (
              <>
                {tf.state.value.length === 0 && (
                  <p className={styles.sectionIntro}>This faction has no troops.</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }: DragEndEvent) => {
                    if (!over) return;
                    const from = indexFromSortableId(active.id, sortablePrefix);
                    const to = indexFromSortableId(over.id, sortablePrefix);
                    if (from == null || to == null || from === to) return;
                    const nextTroops = arrayMove(tf.state.value, from, to);
                    tf.handleChange(nextTroops);
                    setTroopSideTabByIndex((prev) => {
                      const previousTabs = tf.state.value.map((_, index) => prev[index] ?? 'front');
                      const next = arrayMove(previousTabs, from, to);
                      return Object.fromEntries(
                        next
                          .map((value, nextIdx) => [nextIdx, value] as const)
                          .filter(([, value]) => value === 'back')
                      );
                    });
                  }}
                >
                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {tf.state.value.map((troop, i) => {
                      const itemId = `${sortablePrefix}${i}`;
                      return (
                        <SortableCard
                          key={itemId}
                          id={itemId}
                          className={clsx(styles.arrayCard, styles.arrayCardWithToolbar)}
                        >
                          {({ setActivatorNodeRef, attributes, listeners }) => (
                            <form.Field name={`troops[${i}].back`}>
                              {(bf) => (
                                <>
                                  <FormUnitToolbar
                                    leading={
                                      <>
                                        <ReorderHandleButton
                                          label={`Drag to reorder troop ${i + 1}`}
                                          setActivatorNodeRef={setActivatorNodeRef}
                                          attributes={attributes}
                                          listeners={listeners}
                                        />
                                        <FormTooltip
                                          content={
                                            bf.state.value != null
                                              ? 'Disable flip side'
                                              : 'Enable flip side'
                                          }
                                        >
                                          <FormButton
                                            type="button"
                                            variant="secondary"
                                            iconOnly
                                            aria-label={`Toggle flip side for troop ${i + 1}`}
                                            aria-pressed={bf.state.value != null}
                                            onClick={() => {
                                              if (bf.state.value != null) {
                                                bf.handleChange(undefined);
                                                setTroopSideTabByIndex((prev) => ({
                                                  ...prev,
                                                  [i]: 'front',
                                                }));
                                                return;
                                              }
                                              bf.handleChange(createTroopBackFromFront(troop));
                                              setTroopSideTabByIndex((prev) => ({
                                                ...prev,
                                                [i]: 'front',
                                              }));
                                            }}
                                          >
                                            {bf.state.value != null ? (
                                              <CircleOff size={16} aria-hidden />
                                            ) : (
                                              <Rotate3d size={16} aria-hidden />
                                            )}
                                          </FormButton>
                                        </FormTooltip>
                                      </>
                                    }
                                    center={
                                      bf.state.value != null ? (
                                        <FormTabs
                                          value={
                                            troopSideTabByIndex[i] === 'back' ? 'back' : 'front'
                                          }
                                          onValueChange={(next) =>
                                            setTroopSideTabByIndex((prev) => ({
                                              ...prev,
                                              [i]: next === 'back' ? 'back' : 'front',
                                            }))
                                          }
                                          items={[
                                            {
                                              value: 'front',
                                              label: 'Front',
                                              ariaLabel: `Front side troop ${i + 1}`,
                                            },
                                            {
                                              value: 'back',
                                              label: 'Back',
                                              ariaLabel: `Backside troop ${i + 1}`,
                                            },
                                          ]}
                                        />
                                      ) : null
                                    }
                                    actions={
                                      <IconActionButton
                                        type="button"
                                        label="Remove troop"
                                        variant="danger"
                                        onClick={() => tf.removeValue(i)}
                                      >
                                        <Trash2 size={16} aria-hidden />
                                      </IconActionButton>
                                    }
                                  />
                                  <div className={styles.unitCardBody}>
                                    <div className={styles.troopSides}>
                                      {bf.state.value == null ? (
                                        <TroopSideFields form={form} troopIndex={i} side="front" />
                                      ) : troopSideTabByIndex[i] === 'back' ? (
                                        <TroopSideFields form={form} troopIndex={i} side="back" />
                                      ) : (
                                        <TroopSideFields form={form} troopIndex={i} side="front" />
                                      )}
                                      <div className={styles.troopCountField}>
                                        <form.Field name={`troops[${i}].count`}>
                                          {(field) => (
                                            <FormField label="Count" htmlFor={`troop-${i}-count`}>
                                              <TextField
                                                id={`troop-${i}-count`}
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                  field.handleChange(
                                                    Number.parseInt(e.target.value, 10) || 1
                                                  )
                                                }
                                              />
                                            </FormField>
                                          )}
                                        </form.Field>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </form.Field>
                          )}
                        </SortableCard>
                      );
                    })}
                  </SortableContext>
                </DndContext>
                <IconActionButton
                  type="button"
                  label="Add troop"
                  variant="secondary"
                  onClick={() => tf.pushValue(defaultTroop())}
                >
                  <Plus size={16} aria-hidden />
                </IconActionButton>
              </>
            );
          }}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="rules"
        title="Rules"
        icon={renderAccordionIcon('rules')}
        isOpen={openId === 'rules'}
        onOpen={openSection}
      >
        <form.Field name="rules.startText">
          {(field) => (
            <FormField label="Start text" htmlFor="rules-start">
              <MultilineTextField
                id="rules-start"
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="rules.revivalText">
          {(field) => (
            <FormField label="Revival text" htmlFor="rules-revival">
              <MultilineTextField
                id="rules-revival"
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="rules.spiceCount">
          {(field) => (
            <FormField label="Spice count" htmlFor="rules-spice">
              <TextField
                id="rules-spice"
                type="number"
                min={1}
                step={1}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number.parseInt(e.target.value, 10) || 1)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="rules.alliance.text">
          {(field) => (
            <FormField label="Alliance text" htmlFor="rules-alliance">
              <MultilineTextField
                id="rules-alliance"
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="rules.fate.title">
          {(field) => (
            <FormField label="Fate title" htmlFor="rules-fate-title">
              <TextField
                id="rules-fate-title"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="rules.fate.text">
          {(field) => (
            <FormField label="Fate text" htmlFor="rules-fate-text">
              <MultilineTextField
                id="rules-fate-text"
                rows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="advantages"
        title="Advantages"
        icon={renderAccordionIcon('advantages')}
        isOpen={openId === 'advantages'}
        onOpen={openSection}
      >
        <form.Field name="rules.advantages" mode="array">
          {(af) => {
            const sortablePrefix = 'advantages-';
            const itemIds = getSortableIds(sortablePrefix, af.state.value.length);
            return (
              <>
                {af.state.value.length === 0 && (
                  <p className={styles.sectionIntro}>This faction has no advantages.</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }: DragEndEvent) => {
                    if (!over) return;
                    const from = indexFromSortableId(active.id, sortablePrefix);
                    const to = indexFromSortableId(over.id, sortablePrefix);
                    if (from == null || to == null || from === to) return;
                    af.handleChange(arrayMove(af.state.value, from, to));
                  }}
                >
                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {af.state.value.map((_, i) => {
                      const itemId = `${sortablePrefix}${i}`;
                      return (
                        <SortableCard
                          key={itemId}
                          id={itemId}
                          className={clsx(styles.arrayCard, styles.arrayCardWithToolbar)}
                        >
                          {({ setActivatorNodeRef, attributes, listeners }) => (
                            <>
                              <FormUnitToolbar
                                leading={
                                  <ReorderHandleButton
                                    label={`Drag to reorder advantage ${i + 1}`}
                                    setActivatorNodeRef={setActivatorNodeRef}
                                    attributes={attributes}
                                    listeners={listeners}
                                  />
                                }
                                actions={
                                  <IconActionButton
                                    type="button"
                                    label="Remove advantage"
                                    variant="danger"
                                    onClick={() => af.removeValue(i)}
                                  >
                                    <Trash2 size={16} aria-hidden />
                                  </IconActionButton>
                                }
                              />
                              <div className={styles.unitCardBody}>
                                <div className={styles.advantageFields}>
                                  <form.Field name={`rules.advantages[${i}].title`}>
                                    {(field) => (
                                      <FormField
                                        label="Title (optional)"
                                        htmlFor={`adv-${i}-title`}
                                      >
                                        <TextField
                                          id={`adv-${i}-title`}
                                          value={field.state.value ?? ''}
                                          onBlur={field.handleBlur}
                                          onChange={(e) =>
                                            field.handleChange(e.target.value || undefined)
                                          }
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                  <form.Field name={`rules.advantages[${i}].text`}>
                                    {(field) => (
                                      <FormField label="Text" htmlFor={`adv-${i}-text`}>
                                        <MultilineTextField
                                          id={`adv-${i}-text`}
                                          rows={2}
                                          value={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                  <form.Field name={`rules.advantages[${i}].karama`}>
                                    {(field) => (
                                      <FormField
                                        label="Karama (optional)"
                                        htmlFor={`adv-${i}-karama`}
                                        hint="Describes what happens when this advantage is Karama'd. Leave empty if this advantage cannot be Karama'd."
                                      >
                                        <TextField
                                          id={`adv-${i}-karama`}
                                          value={field.state.value ?? ''}
                                          onBlur={field.handleBlur}
                                          onChange={(e) =>
                                            field.handleChange(e.target.value || undefined)
                                          }
                                        />
                                      </FormField>
                                    )}
                                  </form.Field>
                                </div>
                              </div>
                            </>
                          )}
                        </SortableCard>
                      );
                    })}
                  </SortableContext>
                </DndContext>
                <IconActionButton
                  type="button"
                  label="Add advantage"
                  variant="secondary"
                  onClick={() => af.pushValue(defaultAdvantage())}
                >
                  <Plus size={16} aria-hidden />
                </IconActionButton>
              </>
            );
          }}
        </form.Field>
      </AccordionSection>
    </div>
  );
}
