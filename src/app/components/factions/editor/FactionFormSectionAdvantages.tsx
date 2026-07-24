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
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';

import { defaultAdvantage } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';
import { useFactionSortableItem } from './useFactionSortableItem';

function AdvantageCard({
  form,
  index,
  itemId,
  onRemove,
}: {
  form: FactionFormApi;
  index: number;
  itemId: string;
  onRemove: () => void;
}) {
  const sortable = useFactionSortableItem(itemId);
  const advantage = form.state.values.rules.advantages[index];
  if (!advantage) return null;
  const warningId = `adv-${index}-text-warning`;

  return (
    <Paper ref={sortable.setNodeRef} style={sortable.style} withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="sm" wrap="nowrap">
            <Tooltip label={`Reorder advantage ${index + 1}`}>
              <ActionIcon
                ref={sortable.handle.ref}
                {...sortable.handle.attributes}
                {...sortable.handle.listeners}
                type="button"
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={`Drag to reorder advantage ${index + 1}`}
                style={{ touchAction: 'none', cursor: 'grab' }}
              >
                <GripVertical size={18} aria-hidden />
              </ActionIcon>
            </Tooltip>
            <Box>
              <Text fw={700}>Advantage {index + 1}</Text>
              <Text c="dimmed" size="xs">
                {advantage.title?.trim() || 'Untitled advantage'}
              </Text>
            </Box>
          </Group>
          <Tooltip label={`Remove advantage ${index + 1}`}>
            <ActionIcon
              type="button"
              variant="light"
              color="red"
              aria-label={`Remove advantage ${index + 1}`}
              onClick={onRemove}
            >
              <Trash2 size={16} aria-hidden />
            </ActionIcon>
          </Tooltip>
        </Group>

        <form.Field name={`rules.advantages[${index}].title`}>
          {(field) => (
            <TextInput
              id={`adv-${index}-title`}
              label="Title (optional)"
              description="Leave blank when the rule text is sufficient on its own."
              value={field.state.value ?? ''}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.currentTarget.value || undefined)}
            />
          )}
        </form.Field>

        <form.Field name={`rules.advantages[${index}].text`}>
          {(field) => {
            const textIsBlank = field.state.value.trim().length === 0;
            return (
              <Stack gap={4}>
                <Textarea
                  id={`adv-${index}-text`}
                  label="Advantage rule"
                  description="The primary rules text for this faction advantage."
                  autosize
                  minRows={3}
                  value={field.state.value}
                  aria-describedby={textIsBlank ? warningId : undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                />
                {textIsBlank ? (
                  <Text id={warningId} c="yellow.9" size="xs" role="status">
                    Advantage text is empty. This is advisory and does not prevent saving.
                  </Text>
                ) : null}
              </Stack>
            );
          }}
        </form.Field>

        <form.Field name={`rules.advantages[${index}].karama`}>
          {(field) => (
            <Textarea
              id={`adv-${index}-karama`}
              label="Karama interaction (optional)"
              description="Describe the Karama effect only when this advantage has one."
              autosize
              minRows={2}
              value={field.state.value ?? ''}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.currentTarget.value || undefined)}
            />
          )}
        </form.Field>
      </Stack>
    </Paper>
  );
}

export function FactionFormSectionAdvantages({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Stack component="section" gap="md" aria-labelledby="advantages-heading">
      <Stack gap={2}>
        <Text id="advantages-heading" fw={700} size="lg">
          Faction advantages
        </Text>
        <Text c="dimmed" size="sm">
          Advantages appear in this order in faction rules output. Titles and Karama interactions
          are optional.
        </Text>
      </Stack>

      <form.Field name="rules.advantages" mode="array">
        {(field) => {
          const sortablePrefix = 'advantages-';
          const itemIds = getSortableIds(sortablePrefix, field.state.value.length);
          return (
            <Stack gap="md">
              {field.state.value.length === 0 ? (
                <Alert color="gray" variant="light" title="No faction advantages">
                  This faction currently has no authored special advantages.
                </Alert>
              ) : null}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }: DragEndEvent) => {
                  if (!over) return;
                  const from = indexFromSortableId(active.id, sortablePrefix);
                  const to = indexFromSortableId(over.id, sortablePrefix);
                  if (from == null || to == null || from === to) return;
                  field.handleChange(arrayMove(field.state.value, from, to));
                }}
              >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <Stack gap="md">
                    {field.state.value.map((_, index) => {
                      const itemId = `${sortablePrefix}${index}`;
                      return (
                        <AdvantageCard
                          key={itemId}
                          form={form}
                          index={index}
                          itemId={itemId}
                          onRemove={() => field.removeValue(index)}
                        />
                      );
                    })}
                  </Stack>
                </SortableContext>
              </DndContext>

              <Button
                type="button"
                variant="light"
                color="dune"
                leftSection={<Plus size={16} aria-hidden />}
                onClick={() => field.pushValue(defaultAdvantage())}
              >
                Add faction advantage
              </Button>
            </Stack>
          );
        }}
      </form.Field>
    </Stack>
  );
}
