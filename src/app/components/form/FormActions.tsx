import type { ReactNode } from 'react';

import styles from './Form.module.css';

interface FormActionsProps {
  children: ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return <div className={styles.buttons}>{children}</div>;
}
