import type { FC, ReactNode } from 'react';
import type { z } from 'zod';

import type { Background as BackgroundSchema } from '../../data/objects';
import { Background } from './Background';
import styles from './BackgroundRenderer.module.css';

type BackgroundValue = string | z.infer<typeof BackgroundSchema>;

type BackgroundRendererProps = {
  background: BackgroundValue;
  className?: string;
  children?: ReactNode;
};

/**
 * Generic component that renders either:
 * - A CSS background style (when background is a string URL)
 * - A Background component (when background is a Background object)
 */
export const BackgroundRenderer: FC<BackgroundRendererProps> = ({
  background,
  className,
  children,
}) => {
  const isString = typeof background === 'string';

  if (isString) {
    return (
      <div
        className={className}
        style={{ background: `url(${background}) top left / cover no-repeat` }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={styles.overlay}>
        <Background {...background} />
      </div>
      {children}
    </div>
  );
};
