import clsx from 'clsx';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import styles from './Input.module.css';

export type InputFieldVariant = 'input' | 'textarea';

export function inputFieldClassNames(options?: {
  variant?: InputFieldVariant;
  padded?: boolean;
}): string {
  const variant = options?.variant ?? 'input';
  const padded = options?.padded ?? false;
  return clsx(variant === 'textarea' ? styles.textarea : styles.input, padded && styles.padded);
}

type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'className'> & {
  className?: string;
  /** When true, skip field chrome (border, glass background); use `className` only (e.g. inside `PrefixedField`). */
  unstyled?: boolean;
  padded?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, padded = true, unstyled = false, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={
        unstyled
          ? clsx(className)
          : clsx(inputFieldClassNames({ variant: 'input', padded }), className)
      }
      {...rest}
    />
  );
});

type TextareaProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'className'> & {
  className?: string;
  padded?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, padded = false, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={clsx(inputFieldClassNames({ variant: 'textarea', padded }), className)}
      {...rest}
    />
  );
});
