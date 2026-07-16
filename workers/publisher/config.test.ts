import { describe, expect, test } from 'vitest';

import { parsePublisherConfig } from './config';
import { rendererManifest } from './renderer-manifest.generated';

function env(overrides: Record<string, string> = {}): Env {
  return {
    ASSET_PUBLISHER_POLL_SECRET: 'poll-secret',
    ASSET_PUBLISHER_EXECUTOR_SECRET: 'executor-secret',
    CAPTURE_BASE_URL: 'https://publisher.example.com',
    CONVEX_POLL_URL: 'https://convex.example.com/poll',
    CONVEX_EXECUTOR_BASE_URL: 'https://convex.example.com/executor',
    CONVEX_RENDER_URL: 'https://convex.example.com/render',
    SUPPORTED_RENDERER_VERSION: rendererManifest.rendererVersion,
    EXECUTOR_MAX_ITEMS: '1',
    SOFT_DEADLINE_MS: '480000',
    UPLOAD_MARGIN_MS: '120000',
    BROWSER_CAPTURE_TIMEOUT_MS: '45000',
    BROWSER_CLEANUP_GRACE_MS: '15000',
    PDF_MAX_BYTES: '2000000',
    QUEUE_MAX_PRE_OWNERSHIP_ATTEMPTS: '2',
    QUEUE_RETRY_DELAY_SECONDS: '60',
    R2_STORAGE_CEILING_BYTES: '8000000000',
    R2_ESTIMATED_INVENTORY_BYTES: '0',
    R2_INVENTORY_OBSERVED_AT_MS: '0',
    R2_INVENTORY_MAX_AGE_MS: '86400000',
    R2_UNACCOUNTED_WRITE_BUDGET_BYTES: '200000000',
    ...overrides,
  } as unknown as Env;
}

describe('publisher lifecycle configuration', () => {
  test('accepts the inert production timing contract', () => {
    expect(parsePublisherConfig(env())).toMatchObject({
      softDeadlineMs: 480_000,
      browserCaptureTimeoutMs: 45_000,
      browserCleanupGraceMs: 15_000,
    });
  });

  test('rejects phase settings that could consume the cleanup and settlement margin', () => {
    expect(() =>
      parsePublisherConfig(
        env({ BROWSER_CAPTURE_TIMEOUT_MS: '470000', BROWSER_CLEANUP_GRACE_MS: '9000' })
      )
    ).toThrow(/absolute executor lifecycle deadline/);
  });

  test.each([
    rendererManifest.rendererId,
    'mutable-renderer-alias',
  ])('rejects unsupported renderer version %s', (rendererVersion) => {
    expect(() =>
      parsePublisherConfig(env({ SUPPORTED_RENDERER_VERSION: rendererVersion }))
    ).toThrow(/embedded renderer compatibility version/);
  });
});
