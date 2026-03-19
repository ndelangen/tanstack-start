import type { ReactNode } from 'react';

import styles from './Form.module.css';

interface FormFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}

export function FormField({ label, hint, error, children, htmlFor }: FormFieldProps) {
  return (
    <div className={styles.field}>
      {label != null && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {hint != null && <p className={styles.hint}>{hint}</p>}
      {children}
      {error != null && <span className={styles.error}>{error}</span>}
    </div>
  );
}
