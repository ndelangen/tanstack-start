// import { devtools } from '@tanstack/devtools-vite';
import os from 'node:os';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

const config = defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
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
      // Netlify serves `dist/client` as static files — prerender must run or there is no HTML to host.
      // `crawlLinks: false` keeps this to the default `/` + SPA shell only (no full-site crawl).
      prerender: {
        concurrency: Math.max(1, os.cpus().length),
        crawlLinks: false,
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
