import type { ReactFormExtendedApi } from '@tanstack/react-form';
import clsx from 'clsx';
import { GripVertical, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { Faction } from '@db/factions';
import { FormButton, FormField, FormInput, FormTextarea } from '@app/components/form';
import { GENERIC, LEADERS, LOGO, TROOP, TROOP_MODIFIER } from '@game/data/generated';
import { factionSlugBaseFromName, TTSColor } from '@game/schema/faction';

import { AssetAutocomplete } from './AssetAutocomplete';
import { BackgroundColorSlot } from './BackgroundColorSlot';
import styles from './FactionEditor.module.css';
import { HexColorRow } from './HexColorRow';
import { type FactionEditorSectionId, useEditorAccordionHash } from './useEditorAccordionHash';

type VoidVal = undefined;
export type FactionFormApi = ReactFormExtendedApi<
  Faction,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  VoidVal,
  never
>;

const logoOptions = [...LOGO.options, ...GENERIC.options] as readonly string[];

const defaultLeader = (): Faction['leaders'][number] => ({
  name: '',
  strength: '1',
  image: LEADERS.options[0],
});

const defaultTroop = (): Faction['troops'][number] => ({
  name: '',
  image: TROOP.options[0],
  description: '',
  count: 20,
});

const defaultTroopBack = (): NonNullable<Faction['troops'][number]['back']> => ({
  name: '',
  image: TROOP.options[0],
  description: '',
});

const defaultAdvantage = (): Faction['rules']['advantages'][number] => ({
  text: '',
});

function AccordionSection({
  id,
  title,
  isOpen,
  onOpen,
  children,
}: {
  id: FactionEditorSectionId;
  title: string;
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
        {title}
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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const clearDragUi = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <FormField label="TTS colors (ordered)">
      <p className={styles.ttsHint}>
        <strong>Order is essential</strong> for Tabletop Simulator: the first entry is the primary
        tone, the second is next, and so on. Drag the handle on the left to reorder. Each color can
        appear only once.
      </p>
      <ul className={styles.ttsList}>
        {value.map((c, i) => (
          <li
            key={c}
            className={clsx(
              styles.ttsRow,
              draggingIndex === i && styles.ttsRowDragging,
              dragOverIndex === i &&
                draggingIndex !== null &&
                draggingIndex !== i &&
                styles.ttsRowDropTarget
            )}
            onDragOver={(e) => {
              if (draggingIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverIndex(i);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverIndex((prev) => (prev === i ? null : prev));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData('text/plain');
              const from = Number.parseInt(raw, 10);
              if (!Number.isNaN(from)) {
                reorder(from, i);
              }
              clearDragUi();
            }}
          >
            <button
              type="button"
              className={styles.ttsDragHandle}
              draggable
              aria-label={`Drag to reorder slot ${i + 1}`}
              onDragStart={(e) => {
                setDraggingIndex(i);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragEnd={clearDragUi}
            >
              <GripVertical size={18} strokeWidth={2} aria-hidden />
            </button>
            <span className={styles.ttsIndex} title="Order index">
              {i + 1}.
            </span>
            <select
              className={styles.ttsSelect}
              value={c}
              aria-label={`TTS color slot ${i + 1}`}
              draggable={false}
              onChange={(e) => {
                const picked = e.target.value as Faction['colors'][number];
                if (value.some((v, j) => j !== i && v === picked)) return;
                const next = [...value];
                next[i] = picked;
                onChange(next);
              }}
            >
              {optionsForSlot(value, i).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className={styles.ttsRowActions}>
              <button
                type="button"
                className={styles.ttsRemove}
                aria-label={`Remove TTS color slot ${i + 1}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <FormButton
        type="button"
        variant="secondary"
        disabled={firstUnusedColor(value) == null}
        onClick={() => {
          const add = firstUnusedColor(value);
          if (add) onChange([...value, add]);
        }}
      >
        Add color to end
      </FormButton>
    </FormField>
  );
}

export function FactionFormFields({ form }: { form: FactionFormApi }) {
  const { openId, openSection } = useEditorAccordionHash();

  return (
    <div className={styles.formColumn}>
      <AccordionSection
        id="identity"
        title="Identity"
        isOpen={openId === 'identity'}
        onOpen={openSection}
      >
        <form.Field name="name">
          {(field) => (
            <FormField label="Display name" htmlFor="faction-name">
              <FormInput
                id="faction-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const v = e.target.value;
                  field.handleChange(v);
                  form.setFieldValue('id', factionSlugBaseFromName(v));
                }}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="id">
          {(field) => (
            <FormField
              label="Faction id (auto)"
              hint="Set from display name when you save. A number is appended if this id is already in use."
            >
              <p className={styles.readOnlySlug} aria-live="polite">
                {field.state.value}
              </p>
            </FormField>
          )}
        </form.Field>
        <form.Field name="logo">
          {(field) => (
            <AssetAutocomplete
              id="faction-logo"
              label="Logo"
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              options={logoOptions}
            />
          )}
        </form.Field>
        <form.Field name="themeColor">
          {(field) => (
            <FormField label="Theme color (#rrggbb)" htmlFor="faction-theme-text">
              <HexColorRow
                pickerId="faction-theme-picker"
                textId="faction-theme-text"
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                onBlur={field.handleBlur}
                pickerAriaLabel="Pick theme color"
                constrainedWidth
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
        isOpen={openId === 'background'}
        onOpen={openSection}
      >
        <form.Field name="background.image">
          {(field) => (
            <FormField label="Background texture image" htmlFor="bg-image">
              <FormInput
                id="bg-image"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="background.colors[0]">
          {(field) => (
            <BackgroundColorSlot
              legend="Background layer A"
              idPrefix="bg-a"
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="background.colors[1]">
          {(field) => (
            <BackgroundColorSlot
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

      <AccordionSection id="hero" title="Hero" isOpen={openId === 'hero'} onOpen={openSection}>
        <form.Field name="hero.name">
          {(field) => (
            <FormField label="Hero name" htmlFor="hero-name">
              <FormInput
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
            <AssetAutocomplete
              id="hero-image"
              label="Hero image"
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              options={LEADERS.options}
            />
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="leaders"
        title="Leaders"
        isOpen={openId === 'leaders'}
        onOpen={openSection}
      >
        <form.Field name="leaders" mode="array">
          {(lf) => (
            <>
              {lf.state.value.map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: row identity follows form array index
                <div key={i} className={styles.arrayCard}>
                  <div className={styles.row}>
                    <form.Field name={`leaders[${i}].name`}>
                      {(field) => (
                        <FormField label="Name" htmlFor={`leader-${i}-name`}>
                          <FormInput
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
                          <FormInput
                            id={`leader-${i}-str`}
                            inputMode="text"
                            autoComplete="off"
                            value={
                              field.state.value === undefined || field.state.value === null
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
                        <AssetAutocomplete
                          id={`leader-${i}-img`}
                          label="Image"
                          value={field.state.value}
                          onChange={(v) => field.handleChange(v)}
                          options={LEADERS.options}
                        />
                      )}
                    </form.Field>
                    <FormField label={'\u00a0'}>
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => lf.removeValue(i)}
                      >
                        Remove
                      </FormButton>
                    </FormField>
                  </div>
                </div>
              ))}
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => lf.pushValue(defaultLeader())}
              >
                Add leader
              </FormButton>
            </>
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection
        id="troops"
        title="Troops"
        isOpen={openId === 'troops'}
        onOpen={openSection}
      >
        <form.Field name="troops" mode="array">
          {(tf) => (
            <>
              {tf.state.value.map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: row identity follows form array index
                <div key={i} className={styles.arrayCard}>
                  <form.Field name={`troops[${i}].name`}>
                    {(field) => (
                      <FormField label="Name" htmlFor={`troop-${i}-name`}>
                        <FormInput
                          id={`troop-${i}-name`}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].image`}>
                    {(field) => (
                      <AssetAutocomplete
                        id={`troop-${i}-img`}
                        label="Troop image"
                        value={field.state.value}
                        onChange={(v) => field.handleChange(v)}
                        options={TROOP.options}
                      />
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].description`}>
                    {(field) => (
                      <FormField label="Description" htmlFor={`troop-${i}-desc`}>
                        <FormTextarea
                          id={`troop-${i}-desc`}
                          rows={2}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].star`}>
                    {(field) => (
                      <FormField label="Star modifier" htmlFor={`troop-${i}-star`}>
                        <select
                          id={`troop-${i}-star`}
                          className={styles.select}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(
                              e.target.value === ''
                                ? undefined
                                : (e.target.value as NonNullable<Faction['troops'][number]['star']>)
                            )
                          }
                        >
                          <option value="">None</option>
                          {TROOP_MODIFIER.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].striped`}>
                    {(field) => (
                      <FormField label="Striped pattern" htmlFor={`troop-${i}-striped`}>
                        <input
                          id={`troop-${i}-striped`}
                          type="checkbox"
                          className={styles.checkbox}
                          checked={field.state.value === true}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.checked ? true : undefined)}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].count`}>
                    {(field) => (
                      <FormField label="Count" htmlFor={`troop-${i}-count`}>
                        <FormInput
                          id={`troop-${i}-count`}
                          type="number"
                          min={1}
                          step={1}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(Number.parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`troops[${i}].back`}>
                    {(bf) => (
                      <>
                        <FormField
                          label="Flip side (back of token)"
                          htmlFor={`troop-${i}-flip`}
                          hint="Optional second face for double-sided tokens; same fields as the front."
                        >
                          <input
                            id={`troop-${i}-flip`}
                            type="checkbox"
                            className={styles.checkbox}
                            checked={bf.state.value != null}
                            onChange={(e) => {
                              if (e.target.checked) bf.handleChange(defaultTroopBack());
                              else bf.handleChange(undefined);
                            }}
                          />
                        </FormField>
                        {bf.state.value != null && (
                          <div className={styles.troopFlipSide}>
                            <form.Field name={`troops[${i}].back.name`}>
                              {(field) => (
                                <FormField label="Back name" htmlFor={`troop-${i}-back-name`}>
                                  <FormInput
                                    id={`troop-${i}-back-name`}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                  />
                                </FormField>
                              )}
                            </form.Field>
                            <form.Field name={`troops[${i}].back.image`}>
                              {(field) => (
                                <AssetAutocomplete
                                  id={`troop-${i}-back-img`}
                                  label="Back image"
                                  value={field.state.value}
                                  onChange={(v) => field.handleChange(v)}
                                  options={TROOP.options}
                                />
                              )}
                            </form.Field>
                            <form.Field name={`troops[${i}].back.description`}>
                              {(field) => (
                                <FormField
                                  label="Back description"
                                  htmlFor={`troop-${i}-back-desc`}
                                >
                                  <FormTextarea
                                    id={`troop-${i}-back-desc`}
                                    rows={2}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                  />
                                </FormField>
                              )}
                            </form.Field>
                            <form.Field name={`troops[${i}].back.star`}>
                              {(field) => (
                                <FormField
                                  label="Back star modifier"
                                  htmlFor={`troop-${i}-back-star`}
                                >
                                  <select
                                    id={`troop-${i}-back-star`}
                                    className={styles.select}
                                    value={field.state.value ?? ''}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                      field.handleChange(
                                        e.target.value === ''
                                          ? undefined
                                          : (e.target.value as NonNullable<
                                              NonNullable<Faction['troops'][number]['back']>['star']
                                            >)
                                      )
                                    }
                                  >
                                    <option value="">None</option>
                                    {TROOP_MODIFIER.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                              )}
                            </form.Field>
                            <form.Field name={`troops[${i}].back.striped`}>
                              {(field) => (
                                <FormField
                                  label="Back striped pattern"
                                  htmlFor={`troop-${i}-back-striped`}
                                >
                                  <input
                                    id={`troop-${i}-back-striped`}
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={field.state.value === true}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                      field.handleChange(e.target.checked ? true : undefined)
                                    }
                                  />
                                </FormField>
                              )}
                            </form.Field>
                          </div>
                        )}
                      </>
                    )}
                  </form.Field>
                  <FormButton type="button" variant="secondary" onClick={() => tf.removeValue(i)}>
                    Remove troop
                  </FormButton>
                </div>
              ))}
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => tf.pushValue(defaultTroop())}
              >
                Add troop
              </FormButton>
            </>
          )}
        </form.Field>
      </AccordionSection>

      <AccordionSection id="rules" title="Rules" isOpen={openId === 'rules'} onOpen={openSection}>
        <form.Field name="rules.startText">
          {(field) => (
            <FormField label="Start text" htmlFor="rules-start">
              <FormTextarea
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
              <FormTextarea
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
              <FormInput
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
              <FormTextarea
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
              <FormInput
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
              <FormTextarea
                id="rules-fate-text"
                rows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <h4 className={styles.sectionTitle}>Advantages</h4>
        <form.Field name="rules.advantages" mode="array">
          {(af) => (
            <>
              {af.state.value.map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: row identity follows form array index
                <div key={i} className={styles.arrayCard}>
                  <form.Field name={`rules.advantages[${i}].title`}>
                    {(field) => (
                      <FormField label="Title (optional)" htmlFor={`adv-${i}-title`}>
                        <FormInput
                          id={`adv-${i}-title`}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value || undefined)}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name={`rules.advantages[${i}].text`}>
                    {(field) => (
                      <FormField label="Text" htmlFor={`adv-${i}-text`}>
                        <FormTextarea
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
                      <FormField label="Karama (optional)" htmlFor={`adv-${i}-karama`}>
                        <FormInput
                          id={`adv-${i}-karama`}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value || undefined)}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <FormButton type="button" variant="secondary" onClick={() => af.removeValue(i)}>
                    Remove advantage
                  </FormButton>
                </div>
              ))}
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => af.pushValue(defaultAdvantage())}
              >
                Add advantage
              </FormButton>
            </>
          )}
        </form.Field>
      </AccordionSection>
    </div>
  );
}
