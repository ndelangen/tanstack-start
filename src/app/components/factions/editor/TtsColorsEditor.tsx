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
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import type { Faction } from '@db/factions';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { OptionPicker } from '@app/components/form/OptionPicker';
import { PrefixedField } from '@app/components/form/PrefixedField';
import { SortableItem } from '@app/components/form/SortableItem';
import { SortableReorderHandle } from '@app/components/form/SortableReorderHandle';
import { TTSColor } from '@game/schema/faction';

import styles from './FactionEditor.module.css';

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

export function TtsColorsEditor({
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
                <SortableItem key={itemId} as="li" id={itemId} className={styles.ttsRow}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <PrefixedField
                      className={styles.ttsRowControl}
                      prefix={
                        <div className={styles.ttsPrefixContent}>
                          <SortableReorderHandle
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
                          <UIButton
                            type="button"
                            variant="critical"
                            iconOnly
                            className={styles.ttsRemoveButton}
                            aria-label={`Remove TTS color slot ${i + 1}`}
                            onClick={() => onChange(value.filter((_, j) => j !== i))}
                          >
                            <Trash2 size={16} strokeWidth={2} aria-hidden />
                          </UIButton>
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
                </SortableItem>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <FormTooltip content="Add color at the end">
        <UIButton
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
        </UIButton>
      </FormTooltip>
    </FormField>
  );
}
