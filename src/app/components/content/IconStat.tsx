import { Box, Group, Text, Tooltip, VisuallyHidden } from '@mantine/core';
import type { ReactNode } from 'react';

export interface IconStatProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}

/** A compact icon-and-value fact whose full meaning is available on hover and to assistive tech. */
export function IconStat({ icon, value, label }: IconStatProps) {
  return (
    <Tooltip label={label} openDelay={250}>
      <Group component="span" gap={6} wrap="nowrap">
        <Box component="span" c="dimmed" display="inline-flex" aria-hidden>
          {icon}
        </Box>
        <Text component="span" fw={700} lh={1} aria-hidden>
          {value}
        </Text>
        <VisuallyHidden>{label}</VisuallyHidden>
      </Group>
    </Tooltip>
  );
}
