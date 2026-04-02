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
import { useLayoutEffect, useState } from 'react';

import type { Faction } from '@db/factions';
import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { FormUnitToolbar } from '@app/components/form/FormUnitToolbar';
import { SortableItem } from '@app/components/form/SortableItem';
import { SortableReorderHandle } from '@app/components/form/SortableReorderHandle';
import { SuggestField } from '@app/components/form/SuggestField';
import { TextField } from '@app/components/form/TextField';
import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';
import { LEADERS } from '@game/data/generated';

import styles from './FactionEditor.module.css';
import { assetOptionToPreviewSrc, leaderOptionToLabel } from './factionFormAssetUtils';
import { nextLeaderFromLast } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionLeaders({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [pendingLeaderFocusId, setPendingLeaderFocusId] = useState<string | null>(null);

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
                                label={`Drag to reorder leader ${i + 1}`}
                                setActivatorNodeRef={setActivatorNodeRef}
                                attributes={attributes}
                                listeners={listeners}
                              />
                            }
                            actions={
                              <FormTooltip content="Remove leader">
                                <FormButton
                                  type="button"
                                  variant="danger"
                                  iconOnly
                                  aria-label="Remove leader"
                                  onClick={() => lf.removeValue(i)}
                                >
                                  <Trash2 size={16} aria-hidden />
                                </FormButton>
                              </FormTooltip>
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
                                  <FormField label="Image" htmlFor={`leader-${i}-img`}>
                                    <SuggestField
                                      id={`leader-${i}-img`}
                                      value={field.state.value}
                                      onChange={(v) =>
                                        field.handleChange(v as Faction['leaders'][number]['image'])
                                      }
                                      options={LEADERS.options}
                                      optionToLabel={leaderOptionToLabel}
                                      optionToPreviewSrc={assetOptionToPreviewSrc}
                                    />
                                  </FormField>
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
            <FormTooltip content="Add leader">
              <FormButton
                type="button"
                variant="secondary"
                iconOnly
                aria-label="Add leader"
                onClick={() => {
                  const newIndex = lf.state.value.length;
                  const last = lf.state.value[newIndex - 1];
                  lf.pushValue(nextLeaderFromLast(last));
                  setPendingLeaderFocusId(`leader-${newIndex}-name`);
                }}
              >
                <Plus size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
          </>
        );
      }}
    </form.Field>
  );
}
