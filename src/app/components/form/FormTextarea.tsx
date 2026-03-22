import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import inputStyles from '../ui/Input.module.css';

export function FormTextarea(props: ComponentPropsWithoutRef<'textarea'>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(inputStyles.textarea, className)} {...rest} />;
}
