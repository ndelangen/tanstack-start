import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineMain } from '@storybook/react-vite/node';
import { mergeConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineMain({
  stories: [
    {
      directory: '../src/app/components/ui',
      titlePrefix: 'App/UI',
    },
    {
      directory: '../src/app/components/form',
      titlePrefix: 'App/Form',
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
      plugins: [
        tsconfigPaths({
          projects: [path.resolve(dirname, '../tsconfig.json')],
        }),
      ],
      resolve: {
        alias: {
          '@game': path.resolve(dirname, '../src/game'),
        },
      },
    });
  },
});
