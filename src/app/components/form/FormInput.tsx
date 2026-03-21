import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import styles from './Form.module.css';

export function FormInput(props: ComponentPropsWithoutRef<'input'>) {
  const { className, ...rest } = props;
  return <input className={clsx(styles.input, className)} {...rest} />;
}
