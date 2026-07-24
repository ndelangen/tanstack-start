import { describe, expect, test } from 'vitest';

import { buildProductionFactionQuery, parseAppDevMode, parseEnvFile } from './app-dev';

describe('app:dev command', () => {
  test('keeps online development as the default and local mode explicit', () => {
    expect(parseAppDevMode([])).toBe('cloud');
    expect(parseAppDevMode(['--local'])).toBe('local');
    expect(parseAppDevMode(['--help'])).toBe('help');
    expect(() => parseAppDevMode(['--source', 'prod'])).toThrow('Unknown app:dev argument');
  });

  test('reads the simple local environment file format', () => {
    expect(
      parseEnvFile(`
        # local settings
        CONVEX_BACKEND_PORT=3210
        PLAYWRIGHT_USER_A_EMAIL="user-a@example.com"
        PLAYWRIGHT_USER_PASSWORD='secret'
      `)
    ).toEqual({
      CONVEX_BACKEND_PORT: '3210',
      PLAYWRIGHT_USER_A_EMAIL: 'user-a@example.com',
      PLAYWRIGHT_USER_PASSWORD: 'secret',
    });
  });

  test('builds a read-only projection without production identity fields', () => {
    const query = buildProductionFactionQuery('next-cursor');
    expect(query).toContain('.query("factions")');
    expect(query).toContain('cursor: "next-cursor"');
    expect(query).toContain('data: faction.data');
    expect(query).toContain('group: group ?');
    expect(query).not.toContain('owner_id');
    expect(query).not.toContain('profiles');
    expect(query).not.toContain('group_members');
  });
});
