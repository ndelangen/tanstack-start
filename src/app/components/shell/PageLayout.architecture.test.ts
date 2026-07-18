import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const appRoutesDirectory = fileURLToPath(new URL('../../routes/_app/', import.meta.url));
const appLayoutSource = readFileSync(
  fileURLToPath(new URL('../../routes/_app.tsx', import.meta.url)),
  'utf8'
);
const rootRouteSource = readFileSync(
  fileURLToPath(new URL('../../routes/__root.tsx', import.meta.url)),
  'utf8'
);
const pageLayoutExceptions = new Set(['preview/sheet/$factionSlug.tsx']);

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return listRouteFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('PageLayout route contract', () => {
  const routes = listRouteFiles(appRoutesDirectory).map((path) => ({
    path,
    relativePath: relative(appRoutesDirectory, path),
    source: readFileSync(path, 'utf8'),
  }));

  it('keeps terminal visual routes on PageLayout', () => {
    const violations = routes
      .filter(({ source }) => source.includes('component:'))
      .filter(
        ({ source }) => !source.includes('<Outlet />') && !source.includes('component: Outlet')
      )
      .filter(({ relativePath }) => !pageLayoutExceptions.has(relativePath))
      .filter(({ source }) => !source.includes('<PageLayout'))
      .map(({ relativePath }) => relativePath);

    expect(violations).toEqual([]);
  });

  it('does not split page composition through route metadata', () => {
    const violations = routes
      .filter(({ source }) => source.includes('PageHead'))
      .map(({ relativePath }) => relativePath);

    expect(violations).toEqual([]);
    expect(appLayoutSource).not.toContain('PageHead');
  });

  it('keeps the root not-found screen on the canonical shell', () => {
    expect(rootRouteSource).toContain('<AppShell');
    expect(rootRouteSource).toContain('<PageLayout');
  });
});
