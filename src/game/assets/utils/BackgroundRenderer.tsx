import type { FC, ReactNode } from 'react';

import type { FactionInput } from '../../schema/faction';
import { Background } from './Background';
import styles from './BackgroundRenderer.module.css';

type BackgroundRendererProps = {
  background: FactionInput['background'];
  className?: string;
  children?: ReactNode;
};

export const BackgroundRenderer: FC<BackgroundRendererProps> = ({
  background,
  className,
  children,
}) => {
  return (
    <div className={className}>
      <div className={styles.overlay}>
        <Background {...background} />
      </div>
      {children}
    </div>
  );
};
