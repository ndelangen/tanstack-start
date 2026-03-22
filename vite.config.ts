// import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
  build: {
    assetsDir: 'public', // will make your static assets appear under /public/
  },
  publicDir: 'public',
  plugins: [
    // devtools(),
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
