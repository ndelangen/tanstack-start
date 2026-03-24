// import { devtools } from '@tanstack/devtools-vite';
import os from 'node:os';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const config = defineConfig({
  build: {
    assetsDir: 'public', // will make your static assets appear under /public/
  },
  publicDir: 'public',
  // Typings in the current Vite package lag behind docs/runtime support.
  resolve: {
    ...({ tsconfigPaths: true } as Record<string, unknown>),
  },
  plugins: [
    // devtools(),
    tanstackStart({
      srcDirectory: './src/app',
      prerender: {
        concurrency: Math.max(1, os.cpus().length),
      },
      spa: {
        enabled: true,
        prerender: {
          headers: {
            Connection: 'close',
          },
        },
      },
    }),
    viteReact(),
  ],
});

export default config;
