import clsx from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './Form.module.css';

interface FormPrefixedInputProps extends Pick<ComponentPropsWithoutRef<'div'>, 'className'> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  children: ReactNode;
  prefixClassName?: string;
  mainClassName?: string;
  suffixClassName?: string;
}

export function FormPrefixedInput({
  prefix,
  suffix,
  children,
  className,
  prefixClassName,
  mainClassName,
  suffixClassName,
}: FormPrefixedInputProps) {
  return (
    <div className={clsx(styles.prefixedInput, className)}>
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
