import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';

import type { Faction } from '@db/factions';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { FormUnitToolbar } from '@app/components/form/FormUnitToolbar';
import { LabeledRangeInput } from '@app/components/form/LabeledRangeInput';
import { SortableItem } from '@app/components/form/SortableItem';
import { SortableReorderHandle } from '@app/components/form/SortableReorderHandle';
import { SuggestField } from '@app/components/form/SuggestField';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';

import styles from './FactionEditor.module.css';
import {
  assetOptionToPreviewSrc,
  decalAssetOptions,
  decalAssetOptionToLabel,
} from './factionFormAssetUtils';
import { defaultDecal } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionDecals({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <>
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
                      <SortableItem
                        key={itemId}
                        id={itemId}
                        className={clsx(styles.arrayCard, styles.arrayCardWithToolbar)}
                      >
                        {({ setActivatorNodeRef, attributes, listeners }) => (
                          <>
                            <FormUnitToolbar
                              leading={
                                <SortableReorderHandle
                                  label={`Drag to reorder decal ${i + 1}`}
                                  setActivatorNodeRef={setActivatorNodeRef}
                                  attributes={attributes}
                                  listeners={listeners}
                                />
                              }
                              actions={
                                <FormTooltip content="Remove decal">
                                  <UIButton
                                    type="button"
                                    variant="critical"
                                    iconOnly
                                    aria-label="Remove decal"
                                    onClick={() => df.removeValue(i)}
                                  >
                                    <Trash2 size={16} aria-hidden />
                                  </UIButton>
                                </FormTooltip>
                              }
                            />
                            <div className={styles.unitCardBody}>
                              <form.Field name={`decals[${i}].id`}>
                                {(field) => (
                                  <FormField label="Decal asset" htmlFor={`decal-${i}-id`}>
                                    <SuggestField
                                      id={`decal-${i}-id`}
                                      value={field.state.value}
                                      onChange={(v) =>
                                        field.handleChange(v as Faction['decals'][number]['id'])
                                      }
                                      options={decalAssetOptions}
                                      optionToLabel={decalAssetOptionToLabel}
                                      optionToPreviewSrc={assetOptionToPreviewSrc}
                                    />
                                  </FormField>
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
                                  <LabeledRangeInput
                                    id={`decal-${i}-scale`}
                                    label="Scale (0–1)"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={field.state.value}
                                    onChange={field.handleChange}
                                    formatDisplay={(n) => n.toFixed(2)}
                                  />
                                )}
                              </form.Field>
                              <div className={styles.formRow}>
                                <form.Field name={`decals[${i}].offset[0]`}>
                                  {(field) => (
                                    <LabeledRangeInput
                                      id={`decal-${i}-ox`}
                                      label="Offset X (−500–500)"
                                      min={-500}
                                      max={500}
                                      step={1}
                                      integer
                                      value={field.state.value}
                                      onChange={field.handleChange}
                                    />
                                  )}
                                </form.Field>
                                <form.Field name={`decals[${i}].offset[1]`}>
                                  {(field) => (
                                    <LabeledRangeInput
                                      id={`decal-${i}-oy`}
                                      label="Offset Y (−500–500)"
                                      min={-500}
                                      max={500}
                                      step={1}
                                      integer
                                      value={field.state.value}
                                      onChange={field.handleChange}
                                    />
                                  )}
                                </form.Field>
                              </div>
                            </div>
                          </>
                        )}
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </DndContext>
              <FormTooltip content="Add decal">
                <UIButton
                  type="button"
                  variant="secondary"
                  iconOnly
                  aria-label="Add decal"
                  onClick={() => df.pushValue(defaultDecal())}
                >
                  <Plus size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            </>
          );
        }}
      </form.Field>
    </>
  );
}
