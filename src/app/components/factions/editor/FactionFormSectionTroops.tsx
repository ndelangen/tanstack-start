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
import { CircleOff, Plus, Rotate3d, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@app/components/form/FormField';
import { FormTabs } from '@app/components/form/FormTabs';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { FormUnitToolbar } from '@app/components/form/FormUnitToolbar';
import { SortableItem } from '@app/components/form/SortableItem';
import { SortableReorderHandle } from '@app/components/form/SortableReorderHandle';
import { TextField } from '@app/components/form/TextField';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';

import styles from './FactionEditor.module.css';
import { createTroopBackFromFront, defaultTroop } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';
import { TroopSideFields } from './TroopSideFields';

export function FactionFormSectionTroops({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [troopSideTabByIndex, setTroopSideTabByIndex] = useState<Record<number, 'front' | 'back'>>(
    {}
  );

  return (
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
                    <SortableItem
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
                                    <SortableReorderHandle
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
                                      <UIButton
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
                                      </UIButton>
                                    </FormTooltip>
                                  </>
                                }
                                center={
                                  bf.state.value != null ? (
                                    <FormTabs
                                      value={troopSideTabByIndex[i] === 'back' ? 'back' : 'front'}
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
                                  <FormTooltip content="Remove troop">
                                    <UIButton
                                      type="button"
                                      variant="critical"
                                      iconOnly
                                      aria-label="Remove troop"
                                      onClick={() => tf.removeValue(i)}
                                    >
                                      <Trash2 size={16} aria-hidden />
                                    </UIButton>
                                  </FormTooltip>
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
                    </SortableItem>
                  );
                })}
              </SortableContext>
            </DndContext>
            <FormTooltip content="Add troop">
              <UIButton
                type="button"
                variant="secondary"
                iconOnly
                aria-label="Add troop"
                onClick={() => tf.pushValue(defaultTroop())}
              >
                <Plus size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </>
        );
      }}
    </form.Field>
  );
}
