import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import styles from './Form.module.css';

export function FormTextarea(props: ComponentPropsWithoutRef<'textarea'>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(styles.textarea, className)} {...rest} />;
}
