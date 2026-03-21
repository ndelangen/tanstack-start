import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import styles from './Form.module.css';

type Variant = 'primary' | 'secondary' | 'danger';

interface FormButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  iconOnly?: boolean;
}

export function FormButton({
  variant = 'primary',
  iconOnly = false,
  className,
  type = 'button',
  ...props
}: FormButtonProps) {
  const variantClass =
    variant === 'danger'
      ? styles.buttonDanger
      : variant === 'secondary'
        ? styles.buttonSecondary
        : styles.button;
  return (
    <button
      type={type}
      className={clsx(variantClass, iconOnly && styles.buttonIconOnly, className)}
      {...props}
    />
  );
}
