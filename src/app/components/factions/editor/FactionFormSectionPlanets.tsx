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
  AspectRatio,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react';

import type { Faction } from '@db/factions';
import { getSortableIds, indexFromSortableId } from '@app/lib/dnd-sortable-ids';
import { CURATED_PLANET_IMAGES } from '@game/data/planetCatalogue';

import { defaultPlanet } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';
import { useFactionSortableItem } from './useFactionSortableItem';

type PlanetEntry = NonNullable<Faction['planet']>[number];

function PlanetImageLibrary({
  value,
  onChange,
  index,
}: {
  value: PlanetEntry['image'] | undefined;
  onChange: (image: PlanetEntry['image']) => void;
  index: number;
}) {
  const isCurated = CURATED_PLANET_IMAGES.some((option) => option.image === value);

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        Planet illustration
      </Text>
      <Text size="xs" c="dimmed">
        Choose exactly one of the curated illustrations. This selection is stored now so a future
        planet game asset can use it.
      </Text>

      {!isCurated ? (
        <Alert color="yellow" variant="light" title="Existing external illustration preserved">
          This faction uses an older external image. It will remain unchanged until you select a
          curated illustration below.
        </Alert>
      ) : null}

      <SimpleGrid
        cols={{ base: 3, xs: 4, sm: 5, md: 7 }}
        spacing="xs"
        role="group"
        aria-label={`Curated illustration for planet ${index + 1}`}
      >
        {CURATED_PLANET_IMAGES.map((option, optionIndex) => {
          const selected = option.image === value;
          return (
            <UnstyledButton
              key={option.id}
              type="button"
              aria-label={`Use ${option.label}`}
              aria-pressed={selected}
              onClick={() => onChange(option.image)}
            >
              <Paper
                withBorder
                radius="md"
                p={4}
                bg={selected ? 'dune.0' : undefined}
                style={{
                  borderColor: selected
                    ? 'var(--mantine-color-dune-7)'
                    : 'var(--mantine-color-gray-3)',
                  boxShadow: selected ? '0 0 0 2px var(--mantine-color-dune-3)' : undefined,
                }}
              >
                <AspectRatio ratio={1}>
                  <Box pos="relative">
                    <Image src={option.image} alt="" fit="contain" w="100%" h="100%" />
                    {selected ? (
                      <ActionIcon
                        component="span"
                        color="dune"
                        variant="filled"
                        size="sm"
                        radius="xl"
                        pos="absolute"
                        top={4}
                        right={4}
                        aria-hidden
                      >
                        <Check size={13} />
                      </ActionIcon>
                    ) : null}
                  </Box>
                </AspectRatio>
                <Text size="xs" ta="center" mt={4} fw={selected ? 700 : 500}>
                  {String(optionIndex + 1).padStart(2, '0')}
                </Text>
              </Paper>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function PlanetCard({
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
  const planet = form.state.values.planet?.[index];
  if (!planet) return null;

  return (
    <Paper ref={sortable.setNodeRef} style={sortable.style} withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="sm" wrap="nowrap">
            <Tooltip label={`Reorder planet ${index + 1}`}>
              <ActionIcon
                ref={sortable.handle.ref}
                {...sortable.handle.attributes}
                {...sortable.handle.listeners}
                type="button"
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={`Drag to reorder planet ${index + 1}`}
                style={{ touchAction: 'none', cursor: 'grab' }}
              >
                <GripVertical size={18} aria-hidden />
              </ActionIcon>
            </Tooltip>
            <Box>
              <Text fw={700}>Planet {index + 1}</Text>
              <Text size="xs" c="dimmed">
                {planet.name.trim() || 'Unnamed world'}
              </Text>
            </Box>
          </Group>
          <Tooltip label={`Remove planet ${index + 1}`}>
            <ActionIcon
              type="button"
              variant="light"
              color="red"
              aria-label={`Remove planet ${index + 1}`}
              onClick={onRemove}
            >
              <Trash2 size={16} aria-hidden />
            </ActionIcon>
          </Tooltip>
        </Group>

        <form.Field name={`planet[${index}].image`}>
          {(field) => (
            <PlanetImageLibrary
              index={index}
              value={field.state.value}
              onChange={(image) => field.handleChange(image)}
            />
          )}
        </form.Field>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <form.Field name={`planet[${index}].name`}>
            {(field) => (
              <TextInput
                id={`planet-${index}-name`}
                label="Planet name"
                description="The authored name of this faction world."
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
              />
            )}
          </form.Field>
          <form.Field name={`planet[${index}].description`}>
            {(field) => (
              <Textarea
                id={`planet-${index}-description`}
                label="Planet description"
                description="Stored with the world for future artifact use."
                autosize
                minRows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
              />
            )}
          </form.Field>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

export function FactionFormSectionPlanets({ form }: { form: FactionFormApi }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Stack component="section" gap="md" aria-labelledby="faction-worlds-heading">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Text id="faction-worlds-heading" fw={700} size="lg">
            Faction worlds
          </Text>
          <Text c="dimmed" size="sm">
            Add zero or more worlds and keep them in the order that best represents the faction.
          </Text>
        </Box>
        <Badge color="yellow" variant="light">
          Game asset: To be implemented later
        </Badge>
      </Group>

      <form.Field name="planet">
        {(field) => {
          const planets = field.state.value ?? [];
          const sortablePrefix = 'planets-';
          const itemIds = getSortableIds(sortablePrefix, planets.length);
          return (
            <Stack gap="md">
              {planets.length === 0 ? (
                <Alert color="gray" variant="light" title="No faction worlds">
                  Worlds are optional. Add one when a planet is part of this faction&apos;s
                  identity.
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
                  field.handleChange(arrayMove(planets, from, to));
                }}
              >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <Stack gap="md">
                    {planets.map((_, index) => {
                      const itemId = `${sortablePrefix}${index}`;
                      return (
                        <PlanetCard
                          key={itemId}
                          form={form}
                          index={index}
                          itemId={itemId}
                          onRemove={() =>
                            field.handleChange(
                              planets.filter((__, itemIndex) => itemIndex !== index)
                            )
                          }
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
                onClick={() => field.handleChange([...planets, defaultPlanet()])}
              >
                Add faction world
              </Button>
            </Stack>
          );
        }}
      </form.Field>
    </Stack>
  );
}
