import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import styles from './Form.module.css';

interface FormTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function FormTooltip({ content, children, side = 'top' }: FormTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={8} className={styles.tooltipContent}>
            {content}
            <Tooltip.Arrow className={styles.tooltipArrow} width={10} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
