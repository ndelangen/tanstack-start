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
export type IconButtonLinkProps = Omit<IconButtonAsLink, 'children'> & {
  children: ReactNode;
};

function iconButtonClassNames(variant: IconButtonVariant): string {
  const base = [styles.button, styles.buttonIconOnly];
  switch (variant) {
    case 'nav':
      return clsx(...base, styles.nav);
    case 'secondary':
      return clsx(...base, styles.buttonSecondary, styles.linkPlain);
    case 'critical':
      return clsx(...base, styles.buttonDanger, styles.linkPlain);
    case 'confirm':
      return clsx(...base, styles.linkPlain);
  }
}

/**
 * Square icon control: semantic variants (`nav`, `secondary`, `confirm`, `critical`).
 * Pass `to` to render a TanStack Router [`Link`](https://tanstack.com/router); otherwise a `<button>`.
 */
export function IconButton({ variant = 'confirm', className, children, ...rest }: IconButtonProps) {
  const cn = clsx(iconButtonClassNames(variant), className);

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

export function IconButtonLink(props: IconButtonLinkProps) {
  return <IconButton {...props} />;
}
