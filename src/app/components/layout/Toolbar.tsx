import clsx from 'clsx';
import {
  Children,
  type ComponentPropsWithoutRef,
  isValidElement,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import styles from './Toolbar.module.css';

function Left({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function Center({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function Right({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export type ToolbarProps = {
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>;

type ToolbarComponent = ((props: ToolbarProps) => ReactNode) & {
  Left: typeof Left;
  Center: typeof Center;
  Right: typeof Right;
};

const ToolbarBase = ({ className, children, ...rest }: ToolbarProps) => {
  let left: ReactNode = null;
  let center: ReactNode = null;
  let right: ReactNode = null;

  Children.forEach(children, (child) => {
    if (!isValidElement<PropsWithChildren>(child)) {
      return;
    }

    if (child.type === Left) {
      left = child.props.children;
      return;
    }

    if (child.type === Center) {
      center = child.props.children;
      return;
    }

    if (child.type === Right) {
      right = child.props.children;
    }
  });

  return (
    <div className={clsx(styles.root, className)} {...rest}>
      <div className={styles.left}>{left}</div>
      <div className={styles.center}>{center}</div>
      <div className={styles.right}>{right}</div>
    </div>
  );
};

export const Toolbar = Object.assign(ToolbarBase, {
  Left,
  Center,
  Right,
}) as ToolbarComponent;
