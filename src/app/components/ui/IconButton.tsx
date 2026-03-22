import { Link, type LinkComponentProps } from '@tanstack/react-router';
import clsx from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './IconButton.module.css';

export type IconButtonVariant = 'nav' | 'secondary' | 'confirm' | 'critical';

type IconButtonShared = {
  variant?: IconButtonVariant;
  className?: string;
  children: ReactNode;
};

type IconButtonAsLink = IconButtonShared & LinkComponentProps;

type IconButtonAsButton = IconButtonShared &
  ComponentPropsWithoutRef<'button'> & {
    to?: undefined;
  };

export type IconButtonProps = IconButtonAsLink | IconButtonAsButton;

function variantClassName(variant: IconButtonVariant): string {
  switch (variant) {
    case 'nav':
      return styles.nav;
    case 'secondary':
      return styles.secondary;
    case 'critical':
      return styles.critical;
    case 'confirm':
      return styles.confirm;
  }
}

/**
 * Square icon control: semantic variants (`nav`, `secondary`, `confirm`, `critical`).
 * Pass `to` to render a TanStack Router [`Link`](https://tanstack.com/router); otherwise a `<button>`.
 */
export function IconButton({ variant = 'confirm', className, children, ...rest }: IconButtonProps) {
  const cn = clsx(variantClassName(variant), className);

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...linkProps } = rest as Omit<
      IconButtonAsLink,
      'variant' | 'className' | 'children'
    >;
    return (
      <Link {...linkProps} to={to} className={cn}>
        {children}
      </Link>
    );
  }

  const { type = 'button', ...buttonProps } = rest as Omit<
    IconButtonAsButton,
    'variant' | 'className' | 'children'
  >;
  return (
    <button type={type} {...buttonProps} className={cn}>
      {children}
    </button>
  );
}
