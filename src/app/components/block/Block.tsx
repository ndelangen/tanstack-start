import { Link, type LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import styles from './Block.module.css';

interface BlockProps {
  children: ReactNode;
  className?: string;
}

export function Block({ children, className }: BlockProps) {
  return (
    <div className={className ? `${styles.block} ${className}` : styles.block}>{children}</div>
  );
}

interface BlockLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

export function BlockLink({ children, className, ...linkProps }: BlockLinkProps) {
  return (
    <Link
      {...linkProps}
      className={className ? `${styles.blockLink} ${className}` : styles.blockLink}
    >
      {children}
    </Link>
  );
}
