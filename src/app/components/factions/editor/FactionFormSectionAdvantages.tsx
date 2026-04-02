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

import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { FormUnitToolbar } from '@app/components/form/FormUnitToolbar';
import { MultilineTextField } from '@app/components/form/MultilineTextField';
import { SortableItem } from '@app/components/form/SortableItem';
import { SortableReorderHandle } from '@app/components/form/SortableReorderHandle';
import { TextField } from '@app/components/form/TextField';
import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';

import styles from './FactionEditor.module.css';
import { defaultAdvantage } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionAdvantages({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
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
                                label={`Drag to reorder advantage ${i + 1}`}
                                setActivatorNodeRef={setActivatorNodeRef}
                                attributes={attributes}
                                listeners={listeners}
                              />
                            }
                            actions={
                              <FormTooltip content="Remove advantage">
                                <FormButton
                                  type="button"
                                  variant="danger"
                                  iconOnly
                                  aria-label="Remove advantage"
                                  onClick={() => af.removeValue(i)}
                                >
                                  <Trash2 size={16} aria-hidden />
                                </FormButton>
                              </FormTooltip>
                            }
                          />
                          <div className={styles.unitCardBody}>
                            <div className={styles.advantageFields}>
                              <form.Field name={`rules.advantages[${i}].title`}>
                                {(field) => (
                                  <FormField label="Title (optional)" htmlFor={`adv-${i}-title`}>
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
                    </SortableItem>
                  );
                })}
              </SortableContext>
            </DndContext>
            <FormTooltip content="Add advantage">
              <FormButton
                type="button"
                variant="secondary"
                iconOnly
                aria-label="Add advantage"
                onClick={() => af.pushValue(defaultAdvantage())}
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
