import type { ComponentPropsWithoutRef } from 'react';

import styles from './Form.module.css';

export function FormInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input className={styles.input} {...props} />;
}
