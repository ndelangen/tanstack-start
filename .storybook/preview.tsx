import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';

import '../src/app/styles/fonts.css';

import * as sizes from '../src/game/data/sizes';

export default definePreview({
  addons: [addonDocs()],
  parameters: {
    layout: 'centered',
    viewport: {
      options: {
        page: {
          name: 'Page',
          styles: {
            width: `${Math.round(sizes.page.width)}px`,
            height: `${Math.round(sizes.page.height)}px`,
          },
        },
        card: {
          name: 'Card',
          styles: {
            width: `${Math.round(sizes.card.width)}px`,
            height: `${Math.round(sizes.card.height)}px`,
          },
        },
        shield: {
          name: 'Shield',
          styles: {
            width: `${Math.round(sizes.shield.width)}px`,
            height: `${Math.round(sizes.shield.height)}px`,
          },
        },
        disc: {
          name: 'Disc',
          styles: {
            width: `${Math.round(sizes.disc.width)}px`,
            height: `${Math.round(sizes.disc.height)}px`,
          },
        },
        scene: {
          name: 'Scene',
          styles: {
            width: `1000px`,
            height: `1100px`,
          },
        },
      },
    },
  },
  decorators: [
    (Story, { globals }) => {
      const { viewport } = globals;
      console.log({ viewport });
      const viewportValue = viewport.value as keyof typeof sizes;
      let size: typeof sizes.page | undefined;
      if (viewportValue === 'page') {
        size = sizes.page;
      } else if (viewportValue === 'card') {
        size = sizes.card;
      } else if (viewportValue === 'shield') {
        size = sizes.shield;
      } else if (viewportValue === 'disc') {
        size = sizes.disc;
      }
      if (size) {
        return (
          <div style={{ ...size }}>
            <Story />
          </div>
        );
      }
      return <Story />;
    },
  ],
  initialGlobals: {
    backgrounds: {
      value: '#333333',
      grid: true,
    },
  },
});
