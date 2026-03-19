import type { ComponentPropsWithoutRef } from 'react';

import styles from './Form.module.css';

export function FormTextarea(props: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea className={styles.textarea} {...props} />;
}
