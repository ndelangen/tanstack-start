import type { ReactNode } from 'react';

import { Toolbar } from '@app/components/generic/layout';

interface FormActionsProps {
  children: ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return (
    <Toolbar>
      <Toolbar.Left>{children}</Toolbar.Left>
    </Toolbar>
  );
}
