import clsx from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { inputFieldClassNames } from '../ui/Input';
import styles from './Form.module.css';

export interface PrefixedFieldProps extends Pick<ComponentPropsWithoutRef<'div'>, 'className'> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  children: ReactNode;
  prefixClassName?: string;
  mainClassName?: string;
  suffixClassName?: string;
}

export function PrefixedField({
  prefix,
  suffix,
  children,
  className,
  prefixClassName,
  mainClassName,
  suffixClassName,
}: PrefixedFieldProps) {
  return (
    <div
      className={clsx(
        inputFieldClassNames({ variant: 'input', padded: false }),
        styles.prefixedInput,
        className
      )}
    >
      {prefix != null && (
        <div className={clsx(styles.prefixedPrefix, prefixClassName)}>{prefix}</div>
      )}
      <div className={clsx(styles.prefixedMain, mainClassName)}>{children}</div>
      {suffix != null && (
        <div className={clsx(styles.prefixedSuffix, suffixClassName)}>{suffix}</div>
      )}
    </div>
  );
}

/** @deprecated Use `PrefixedField` instead. */
export const FormPrefixedInput = PrefixedField;
