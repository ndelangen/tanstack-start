import { defineMain } from '@storybook/react-vite/node';
import { mergeConfig } from 'vite';

export default defineMain({
  stories: [
    {
      directory: '../src/app/components',
      titlePrefix: 'App',
    },
    {
      directory: '../src/game/assets/faction',
      titlePrefix: 'Faction',
    },
    {
      directory: '../src/game/assets/card',
      titlePrefix: 'Card',
    },
    {
      directory: '../src/game/assets/token',
      titlePrefix: 'Token',
    },
    {
      directory: '../src/game/assets/utils',
      titlePrefix: 'Utils',
    },
    {
      directory: '../src/game/book',
      titlePrefix: 'Book',
    },
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  staticDirs: [
    '../public',
    {
      from: '../generated',
      to: 'generated',
    },
  ],
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        ...({ tsconfigPaths: true } as Record<string, unknown>),
      },
    });
  },
});
