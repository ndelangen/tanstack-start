import { describe, expect, test } from 'vitest';

import {
  PUBLISHER_ORIGIN,
  PUBLISHER_RENDERER_VERSION,
  readPublisherConfig,
  validatePublisherDeployContract,
  validatePublisherHealth,
} from './publisher-deployment-contract';

function ciEnvironment(): NodeJS.ProcessEnv {
  return {
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_REF: 'refs/heads/main',
    CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32),
    CLOUDFLARE_API_TOKEN: 'not-a-real-token',
    VITE_CONVEX_URL: 'https://example.convex.cloud',
  };
}

function health() {
  return {
    ok: true,
    publisherEnabled: false,
    cronDispatchEnabled: false,
    maxItems: 1,
    supportedRendererVersion: PUBLISHER_RENDERER_VERSION,
    rendererSupport: {
      supportedRendererVersions: [PUBLISHER_RENDERER_VERSION],
      rendererId: `faction-sheet/sha256:${'c'.repeat(64)}`,
      configuredRendererVersion: PUBLISHER_RENDERER_VERSION,
      configurationMatchesManifest: true,
    },
    identity: {
      workerVersionTag: 'a'.repeat(40),
      rendererId: `faction-sheet/sha256:${'c'.repeat(64)}`,
      rendererManifestDigest: 'c'.repeat(64),
      configuredRendererVersion: PUBLISHER_RENDERER_VERSION,
      rendererConfigurationMatchesManifest: true,
    },
  };
}

describe('publisher CI deployment contract', () => {
  test('accepts the reviewed inert source-controlled configuration', () => {
    expect(() =>
      validatePublisherDeployContract(readPublisherConfig(), ciEnvironment())
    ).not.toThrow();
  });

  test.each([
    ['PUBLISHER_ENABLED', 'true'],
    ['CRON_DISPATCH_ENABLED', 'true'],
    ['EXECUTOR_MAX_ITEMS', '2'],
  ])('fails closed when %s changes', (name, value) => {
    const config = structuredClone(readPublisherConfig());
    (config.vars as Record<string, unknown>)[name] = value;
    expect(() => validatePublisherDeployContract(config, ciEnvironment())).toThrow();
  });

  test('fails closed when a Cron or alternate resource name enters the config', () => {
    const cronConfig = structuredClone(readPublisherConfig());
    cronConfig.triggers = { crons: ['*/15 * * * *'] };
    expect(() => validatePublisherDeployContract(cronConfig, ciEnvironment())).toThrow();

    const bucketConfig = structuredClone(readPublisherConfig());
    (bucketConfig.r2_buckets as Array<Record<string, unknown>>)[0].bucket_name = 'replacement';
    expect(() => validatePublisherDeployContract(bucketConfig, ciEnvironment())).toThrow();
  });

  test('accepts health only when inert flags, renderer support, origin, and Git SHA match', () => {
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        health(),
        'a'.repeat(40),
        `${PUBLISHER_ORIGIN}/__asset-publisher/health`,
        'no-store'
      )
    ).not.toThrow();
  });

  test.each([
    ['publisherEnabled', true],
    ['cronDispatchEnabled', true],
    ['maxItems', 2],
  ])('rejects unsafe health field %s', (name, value) => {
    const response = health() as Record<string, unknown>;
    response[name] = value;
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        response,
        'a'.repeat(40),
        `${PUBLISHER_ORIGIN}/__asset-publisher/health`,
        'no-store'
      )
    ).toThrow();
  });

  test('rejects a renderer mismatch, alternate origin, cached response, or wrong source tag', () => {
    const mismatched = health();
    mismatched.rendererSupport.configurationMatchesManifest = false;
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        mismatched,
        'a'.repeat(40),
        `${PUBLISHER_ORIGIN}/__asset-publisher/health`,
        'no-store'
      )
    ).toThrow();
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        health(),
        'a'.repeat(40),
        'https://alternate.workers.dev/__asset-publisher/health',
        'no-store'
      )
    ).toThrow();
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        health(),
        'a'.repeat(40),
        `${PUBLISHER_ORIGIN}/__asset-publisher/health`,
        'public, max-age=60'
      )
    ).toThrow();
    expect(() =>
      validatePublisherHealth(
        readPublisherConfig(),
        health(),
        'd'.repeat(40),
        `${PUBLISHER_ORIGIN}/__asset-publisher/health`,
        'no-store'
      )
    ).toThrow();
  });
});
