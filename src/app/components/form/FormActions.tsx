import type { ReactNode } from 'react';

import btnStyles from '../ui/Button.module.css';

interface FormActionsProps {
  children: ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return <div className={btnStyles.buttons}>{children}</div>;
}
