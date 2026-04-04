/** biome-ignore-all lint/suspicious/noArrayIndexKey: I don't care */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: I don't care */
import { type FC, useId } from 'react';
import type { z } from 'zod';

import { type Background as BackGroundType, GRADIENT } from '../../data/objects';
import styles from './Background.module.css';

export const Background: FC<z.infer<typeof BackGroundType>> = ({
  colors,
  image,
  opacity = 0, // Set default opacity
  strength = 0, // Set default strength
}) => {
  // Fragment refs like url(#gradient-0) are resolved in the whole HTML document, not per-<svg>.
  const base = useId().replace(/:/g, '');
  const textureId = `bg-${base}-texture`;
  const textureMaskId = `bg-${base}-texture-mask`;
  const gradientId = (i: number) => `bg-${base}-g-${i}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="600px"
      height="600px"
      viewBox="0 0 100 100"
      className={styles.container}
    >
      <defs>
        <pattern id={textureId} width="100" height="100" patternUnits="userSpaceOnUse">
          <g filter={`invert(${1 + strength * 0.01})`}>
            <image
              xlinkHref={image}
              width="100"
              height="100"
              filter={`brightness(${1 + opacity * 0.01})`}
            />
          </g>
        </pattern>
        <mask id={textureMaskId}>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${textureId})`} />
        </mask>
        {colors.map((color, i) => {
          if (!GRADIENT.safeParse(color).success) {
            return null;
          }

          const data = GRADIENT.parse(color);
          if (data.type === 'linear') {
            const { angle, stops } = data;

            const radians = (angle * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const x1 = 0.5 - cos / 2;
            const y1 = 0.5 + sin / 2;
            const x2 = 0.5 + cos / 2;
            const y2 = 0.5 - sin / 2;
            return (
              <linearGradient key={i} id={gradientId(i)} x1={x1} y1={y1} x2={x2} y2={y2}>
                {stops.map(([stopColor, stopScale], j) => (
                  <stop key={j} offset={`${stopScale * 100}%`} stopColor={stopColor} />
                ))}
              </linearGradient>
            );
          }

          if (data.type === 'radial') {
            const { x = 50, y = 50, r = 80, stops } = data;
            return (
              <radialGradient key={i} id={gradientId(i)} cx={`${x}%`} cy={`${y}%`} r={`${r}%`}>
                {stops.map(([stopColor, stopScale], j) => (
                  <stop key={j} offset={`${stopScale * 100}%`} stopColor={stopColor} />
                ))}
              </radialGradient>
            );
          }

          return null;
        })}
      </defs>

      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill={typeof colors[0] === 'string' ? colors[0] : `url(#${gradientId(0)})`}
      />
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill={typeof colors[1] === 'string' ? colors[1] : `url(#${gradientId(1)})`}
        mask={`url(#${textureMaskId})`}
      />
    </svg>
  );
};
