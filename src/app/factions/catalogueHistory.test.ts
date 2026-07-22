import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { expect, test } from 'vitest';

import type { FactionCatalogueSearch } from './catalogue';
import { normalizeFactionCatalogueSearch, parseFactionCatalogueSearch } from './catalogue';

const rulesets = [{ id: 'ruleset-alpha', slug: 'alpha', name: 'Alpha' }] as never;

test('catalogue controls keep one canonical history entry while draft search stays instant', async () => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: parseFactionCatalogueSearch,
  });
  const history = createMemoryHistory({
    initialEntries: ['/?sort=updated&variant=prototype'],
  });
  const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]), history });
  await router.load();

  const initial = normalizeFactionCatalogueSearch(
    router.state.location.search as FactionCatalogueSearch,
    rulesets
  );
  await router.navigate({ to: '/', search: initial, replace: true });
  expect(history.location.search).toBe('?sort=updated');

  let draft = '  duke  ';
  expect(draft.trim()).toBe('duke');
  expect(history.location.search).toBe('?sort=updated');

  const commitDraft = async () => {
    await router.navigate({
      to: '/',
      search: (previous) =>
        parseFactionCatalogueSearch({ ...previous, q: draft.trim() || undefined }),
      replace: true,
    });
  };

  await commitDraft(); // blur
  expect(history.location.search).toContain('q=duke');

  draft = 'leto';
  await commitDraft(); // Enter
  expect(history.location.search).toContain('q=leto');

  await router.navigate({
    to: '/',
    search: (previous) => ({ ...previous, ruleset: 'alpha' }),
    replace: true,
  });
  expect(history.location.search).toContain('ruleset=alpha');

  draft = '';
  await router.navigate({
    to: '/',
    search: (previous) => ({ ...previous, q: undefined, ruleset: undefined }),
    replace: true,
  });

  expect(history.location.search).toBe('?sort=updated');
  expect(history.canGoBack()).toBe(false);
});
