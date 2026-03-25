import clsx from 'clsx';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import styles from './TextField.module.css';

export type TextFieldVariant = 'input' | 'textarea';

export function textFieldClassNames(options?: {
  variant?: TextFieldVariant;
  padded?: boolean;
}): string {
  const variant = options?.variant ?? 'input';
  const padded = options?.padded ?? false;
  return clsx(variant === 'textarea' ? styles.textarea : styles.input, padded && styles.padded);
}

export type TextFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'className'> & {
  className?: string;
  /** Skip input chrome when nested in composed shells like PrefixedField. */
  unstyled?: boolean;
  padded?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, padded = true, unstyled = false, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={
        unstyled ? clsx(className) : clsx(textFieldClassNames({ variant: 'input', padded }), className)
      }
      {...rest}
    />
  );
});
