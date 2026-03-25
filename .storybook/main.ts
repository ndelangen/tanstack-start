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
    config.plugins = (
      config.plugins?.map((plugin) => {
        try {
          if (Array.isArray(plugin)) {
            return plugin.filter((p) => p.name.toLowerCase().includes('tanstack') === false);
          }
          if (!plugin) {
            return false;
          }
          if (plugin.name.toLowerCase().includes('tanstack')) {
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
