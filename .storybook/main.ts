import { defineMain } from '@storybook/react-vite/node';

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
    const hasTanstackName = (value: unknown): boolean => {
      if (value == null || typeof value !== 'object' || !('name' in value)) {
        return false;
      }
      const maybeName = (value as { name?: unknown }).name;
      return typeof maybeName === 'string' && maybeName.toLowerCase().includes('tanstack');
    };

    config.plugins = (
      config.plugins?.map((plugin) => {
        try {
          if (Array.isArray(plugin)) {
            return plugin.filter((p) => !hasTanstackName(p));
          }
          if (!plugin) {
            return false;
          }
          if (hasTanstackName(plugin)) {
            return false;
          }
          return plugin;
        } catch (_error) {
          // console.error('Error filtering plugins', error, plugin);
          return false;
        }
      }) ?? []
    ).filter((p) => !!p);

    return config;
  },
});
