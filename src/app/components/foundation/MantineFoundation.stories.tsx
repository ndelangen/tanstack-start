import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import preview from '@sb/preview';

function MantineFoundationSmoke() {
  return (
    <Paper ff="var(--mantine-font-family)" p="md" shadow="sm" withBorder>
      <Stack>
        <div>
          <Title order={2}>Mantine content foundation</Title>
          <Text c="dimmed">Shell typography, warm sand tones and glass content surfaces.</Text>
        </div>
        <Group>
          <Button>Primary action</Button>
          <Button variant="default">Secondary action</Button>
        </Group>
      </Stack>
    </Paper>
  );
}

const meta = preview.meta({
  component: MantineFoundationSmoke,
});

export const Default = meta.story();
