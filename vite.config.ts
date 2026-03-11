import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';

const config = defineConfig({
  build: {
    assetsDir: 'public', // will make your static assets appear under /public/
  },
  publicDir: 'public',
  plugins: [
    devtools(),
    tailwindcss(),

    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({
      srcDirectory: './src/app',
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
  ],
});

export default config;
