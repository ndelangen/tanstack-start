import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import inputStyles from '../ui/Input.module.css';

export function FormInput(props: ComponentPropsWithoutRef<'input'>) {
  const { className, ...rest } = props;
  return <input className={clsx(inputStyles.input, inputStyles.padded, className)} {...rest} />;
}
