import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import btnStyles from '../ui/Button.module.css';

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
      ? btnStyles.buttonDanger
      : variant === 'secondary'
        ? btnStyles.buttonSecondary
        : undefined;
  return (
    <button
      type={type}
      className={clsx(
        btnStyles.button,
        variantClass,
        iconOnly && btnStyles.buttonIconOnly,
        className
      )}
      {...props}
    />
  );
}
