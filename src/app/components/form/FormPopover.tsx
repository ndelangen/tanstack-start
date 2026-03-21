import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

import styles from './Form.module.css';

interface FormPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function FormPopover({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
}: FormPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={10}
          className={styles.popoverContent}
        >
          {children}
          <Popover.Arrow className={styles.popoverArrow} width={10} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
