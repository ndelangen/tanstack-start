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
  Badge,
  Box,
  Button,
  Grid,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { GripVertical, Plus, Rotate3d, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';
import { TroopToken } from '@game/assets/faction/troop/Troop';

import { createTroopBackFromFront, defaultTroop } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';
import { TroopSideFields } from './TroopSideFields';
import { useFactionSortableItem } from './useFactionSortableItem';

function TroopCard({
  form,
  index,
  itemId,
  activeSide,
  onActiveSideChange,
  onRemove,
  onToggleBack,
  showPreview,
}: {
  form: FactionFormApi;
  index: number;
  itemId: string;
  activeSide: 'front' | 'back';
  onActiveSideChange: (side: 'front' | 'back') => void;
  onRemove: () => void;
  onToggleBack: () => void;
  showPreview: boolean;
}) {
  const sortable = useFactionSortableItem(itemId);
  const troop = form.state.values.troops[index];
  if (!troop) return null;
  const hasBack = troop.back != null;

  return (
    <Paper ref={sortable.setNodeRef} style={sortable.style} withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="sm" wrap="nowrap">
            <Tooltip label={`Reorder troop ${index + 1}`}>
              <ActionIcon
                ref={sortable.handle.ref}
                {...sortable.handle.attributes}
                {...sortable.handle.listeners}
                type="button"
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={`Drag to reorder troop ${index + 1}`}
                style={{ touchAction: 'none', cursor: 'grab' }}
              >
                <GripVertical size={18} aria-hidden />
              </ActionIcon>
            </Tooltip>
            <Box>
              <Group gap="xs">
                <Text fw={700}>Troop {index + 1}</Text>
                {hasBack ? (
                  <Badge variant="light" color="dune">
                    Two-sided
                  </Badge>
                ) : null}
              </Group>
              <Text size="xs" c="dimmed">
                {troop.name.trim() || 'Unnamed troop'}
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            <Button
              type="button"
              variant="light"
              color={hasBack ? 'gray' : 'dune'}
              size="compact-sm"
              leftSection={<Rotate3d size={15} aria-hidden />}
              onClick={onToggleBack}
            >
              {hasBack ? 'Remove flip side' : 'Add flip side'}
            </Button>
            <Tooltip label={`Remove troop ${index + 1}`}>
              <ActionIcon
                type="button"
                variant="light"
                color="red"
                aria-label={`Remove troop ${index + 1}`}
                onClick={onRemove}
              >
                <Trash2 size={16} aria-hidden />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {hasBack ? (
          <SegmentedControl
            value={activeSide}
            onChange={(value) => onActiveSideChange(value === 'back' ? 'back' : 'front')}
            data={[
              { value: 'front', label: 'Front side' },
              { value: 'back', label: 'Back side' },
            ]}
            aria-label={`Side to edit for troop ${index + 1}`}
          />
        ) : null}

        <Grid gap="xl" align="start">
          <Grid.Col span={{ base: 12, sm: showPreview ? 8 : 12 }}>
            <Stack gap="md">
              <TroopSideFields
                form={form}
                troopIndex={index}
                side={hasBack && activeSide === 'back' ? 'back' : 'front'}
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <form.Field name={`troops[${index}].count`}>
                  {(field) => (
                    <NumberInput
                      id={`troop-${index}-count`}
                      label="Physical supply"
                      description="The sheet lists this once as ×N, including two-sided troops."
                      min={1}
                      step={1}
                      allowDecimal={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(value) =>
                        field.handleChange(
                          typeof value === 'number' && Number.isInteger(value) && value > 0
                            ? value
                            : 1
                        )
                      }
                    />
                  )}
                </form.Field>

                <form.Field name={`troops[${index}].planet`}>
                  {(field) => (
                    <TextInput
                      id={`troop-${index}-planet`}
                      label="Planet reference (optional)"
                      description="Data-only association; it has no current rendered consumer."
                      placeholder="e.g. Meridian Prime"
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.currentTarget.value || undefined)
                      }
                    />
                  )}
                </form.Field>
              </SimpleGrid>
            </Stack>
          </Grid.Col>

          {showPreview ? (
            <Grid.Col span={4} visibleFrom="sm">
              <form.Subscribe
                selector={(state) => ({
                  background: state.values.background,
                  troop: state.values.troops[index],
                })}
              >
                {({ background, troop: currentTroop }) =>
                  currentTroop ? (
                    <Stack align="center" gap="sm">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" ta="center">
                        Used on: troop tokens
                      </Text>
                      <Group justify="center" gap="md" wrap="wrap">
                        <Stack align="center" gap={4}>
                          <Box w={104} aria-label={`Front token preview for troop ${index + 1}`}>
                            <TroopToken
                              background={background}
                              image={currentTroop.image}
                              star={currentTroop.star}
                              striped={currentTroop.striped}
                            />
                          </Box>
                          <Text size="xs" c="dimmed">
                            Front
                          </Text>
                        </Stack>
                        {currentTroop.back ? (
                          <Stack align="center" gap={4}>
                            <Box w={104} aria-label={`Back token preview for troop ${index + 1}`}>
                              <TroopToken
                                background={background}
                                image={currentTroop.back.image}
                                star={currentTroop.back.star}
                                striped={currentTroop.back.striped}
                              />
                            </Box>
                            <Text size="xs" c="dimmed">
                              Back
                            </Text>
                          </Stack>
                        ) : null}
                      </Group>
                    </Stack>
                  ) : null
                }
              </form.Subscribe>
            </Grid.Col>
          ) : null}
        </Grid>
      </Stack>
    </Paper>
  );
}

export function FactionFormSectionTroops({
  form,
  showPreview = true,
}: {
  form: FactionFormApi;
  showPreview?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [troopSideTabByIndex, setTroopSideTabByIndex] = useState<Record<number, 'front' | 'back'>>(
    {}
  );

  return (
    <Stack component="section" gap="md" aria-labelledby="troop-inventory-heading">
      <Stack gap={2}>
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text id="troop-inventory-heading" fw={700} size="lg">
              Troop inventory
            </Text>
            <Text c="dimmed" size="sm">
              Troops are rendered as tokens and listed on the faction sheet in this order.
            </Text>
          </Box>
        </Group>
      </Stack>

      <form.Field name="troops" mode="array">
        {(field) => {
          const sortablePrefix = 'troops-';
          const itemIds = getSortableIds(sortablePrefix, field.state.value.length);
          return (
            <Stack gap="md">
              {field.state.value.length === 0 ? (
                <Alert color="gray" variant="light" title="No troop types">
                  This faction currently has no physical troop inventory.
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
                  setTroopSideTabByIndex((previous) => {
                    const tabs = field.state.value.map((_, index) => previous[index] ?? 'front');
                    return Object.fromEntries(arrayMove(tabs, from, to).map((tab, i) => [i, tab]));
                  });
                }}
              >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <Stack gap="md">
                    {field.state.value.map((_, index) => {
                      const itemId = `${sortablePrefix}${index}`;
                      return (
                        <TroopCard
                          key={itemId}
                          form={form}
                          index={index}
                          itemId={itemId}
                          activeSide={troopSideTabByIndex[index] ?? 'front'}
                          onActiveSideChange={(side) =>
                            setTroopSideTabByIndex((previous) => ({ ...previous, [index]: side }))
                          }
                          onRemove={() => field.removeValue(index)}
                          onToggleBack={() => {
                            const next = [...field.state.value];
                            const current = next[index];
                            if (!current) return;
                            next[index] = {
                              ...current,
                              back: current.back ? undefined : createTroopBackFromFront(current),
                            };
                            field.handleChange(next);
                            setTroopSideTabByIndex((previous) => ({
                              ...previous,
                              [index]: 'front',
                            }));
                          }}
                          showPreview={showPreview}
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
                onClick={() => field.pushValue(defaultTroop())}
              >
                Add troop type
              </Button>
            </Stack>
          );
        }}
      </form.Field>
    </Stack>
  );
}
