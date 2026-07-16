import { describe, expect, test, vi } from 'vitest';

import type { PublisherConfig } from './config';
import {
  type AcquireResult,
  type ClaimedTarget,
  ConvexPublisherClient,
  type ExactClaim,
} from './convex';
import { executeOwnedBatch, type FailurePoint, type OwnedBatchDependencies } from './executor';
import { postJson } from './http';
import type { AssetBucket } from './r2';
import { fakeR2Object } from './test-helpers';

const NOW = Date.parse('2026-07-16T12:00:00.000Z');
const config: PublisherConfig = {
  captureBaseUrl: 'https://publisher.example.com',
  convexPollUrl: 'https://convex.example.com/poll',
  convexExecutorBaseUrl: 'https://convex.example.com/executor',
  convexRenderUrl: 'https://convex.example.com/render',
  supportedRendererVersion: 'faction-sheet-v1',
  maxItems: 1,
  softDeadlineMs: 480_000,
  uploadMarginMs: 120_000,
  browserCaptureTimeoutMs: 45_000,
  browserCleanupGraceMs: 5,
  pdfMaxBytes: 2_000_000,
  queueMaxPreOwnershipAttempts: 2,
  queueRetryDelaySeconds: 60,
  r2StorageCeilingBytes: 8_000_000_000,
  r2EstimatedInventoryBytes: 1_000,
  r2InventoryObservedAtMs: NOW,
  r2InventoryMaxAgeMs: 60_000,
  r2UnaccountedWriteBudgetBytes: 200_000_000,
};
const acquisition: Extract<AcquireResult, { status: 'acquired' }> = {
  status: 'acquired',
  replay: false,
  batchToken: 'batch-token-0000000000000001',
  leaseExpiresAt: NOW + 720_000,
  browserReservationMs: 480_000,
  dailyBrowserMs: 480_000,
};
const claim: ClaimedTarget = {
  status: 'claimed',
  replay: false,
  targetId: 'target',
  factionId: 'faction',
  assetType: 'faction_sheet',
  batchToken: acquisition.batchToken,
  claimToken: 'claim-token-0000000000000001',
  generation: 1,
  rendererVersion: 'faction-sheet-v1',
  leaseExpiresAt: acquisition.leaseExpiresAt,
  payloadHash: 'a'.repeat(64),
  renderCapability: 'render-capability-token-000000001',
  renderCapabilityExpiresAt: NOW + 300_000,
};

function r2Object(): R2Object {
  return fakeR2Object({ etag: 'etag-one', size: 3, customMetadata: {}, uploaded: new Date(NOW) });
}

function setup(
  options: {
    claimResult?: typeof claim | { status: 'empty' | 'stale' | 'conflict' };
    revalidateStatus?: 'valid' | 'stale' | 'insufficient_lease';
    browserAvailable?: boolean;
    close?: () => Promise<void>;
    complete?: () => Promise<'completed' | 'stale'>;
    put?: AssetBucket['put'];
    pdfBytes?: number;
    pdfPageCount?: number;
    pdfWidthMm?: number;
    pdfHeightMm?: number;
    captureError?: Error;
    claim?: (
      batchToken: string,
      deadlineAt?: number
    ) => Promise<typeof claim | { status: 'empty' | 'stale' | 'conflict' }>;
    now?: () => number;
    fault?: FailurePoint;
  } = {}
) {
  const fail = vi.fn(async (_claim: ExactClaim, _error: string) => 'failed' as const);
  const release = vi.fn(async (_claim: ExactClaim) => 'released' as const);
  const settleBrowser = vi.fn(async () => 'settled' as const);
  const releaseBatch = vi.fn(async () => 'released' as const);
  const complete = vi.fn(options.complete ?? (async () => 'completed' as const));
  const revalidate = vi.fn(async () => {
    if (options.revalidateStatus === 'stale') return { status: 'stale' as const };
    if (options.revalidateStatus === 'insufficient_lease') {
      return { status: 'insufficient_lease' as const, leaseExpiresAt: NOW + 1 };
    }
    return {
      status: 'valid' as const,
      leaseExpiresAt: claim.leaseExpiresAt,
      factionId: claim.factionId,
      assetType: claim.assetType,
      payloadHash: claim.payloadHash,
    };
  });
  const put = vi.fn(options.put ?? (async () => r2Object()));
  const bucket: AssetBucket = { head: async () => null, put };
  const capture = vi.fn(async () => {
    if (options.captureError) throw options.captureError;
    return {
      bytes: new Uint8Array(options.pdfBytes ?? 3),
      pageCount: options.pdfPageCount ?? 2,
      pageWidthMm: options.pdfWidthMm ?? 150,
      pageHeightMm: options.pdfHeightMm ?? 195,
      consoleErrors: [],
      requestFailures: [],
      pageErrors: [],
      httpErrors: [],
    };
  });
  const close = vi.fn(options.close ?? (async () => undefined));
  const openBrowser = vi.fn(async () => ({ capture, close }));
  const dependencies: OwnedBatchDependencies = {
    client: {
      claim: options.claim ?? (async () => options.claimResult ?? claim),
      settleBrowser,
      releaseBatch,
      revalidate,
      complete,
      fail,
      release,
    },
    bucket,
    browserAvailable: async () => options.browserAvailable ?? true,
    openBrowser,
    now: options.now ?? (() => NOW),
    ...(options.fault
      ? {
          fault(point) {
            if (point === options.fault) throw new Error(`Injected ${point}`);
          },
        }
      : {}),
  };
  return {
    dependencies,
    spies: {
      fail,
      release,
      settleBrowser,
      releaseBatch,
      complete,
      revalidate,
      put,
      capture,
      close,
      openBrowser,
    },
  };
}

describe('one-item owned batch execution', () => {
  test('renders, closes, settles, revalidates, conditionally uploads, and completes', async () => {
    const { dependencies, spies } = setup();
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({
      status: 'completed',
      browserOpened: true,
      browserClosed: true,
      browserSettled: true,
      uploaded: true,
      completed: true,
    });
    expect(spies.revalidate).toHaveBeenCalledBefore(spies.put);
    expect(spies.put).toHaveBeenCalledBefore(spies.complete);
    expect(spies.complete).toHaveBeenCalledBefore(spies.settleBrowser);
  });

  test('empty and duplicate/busy-fenced claims close without upload', async () => {
    for (const status of ['empty', 'stale', 'conflict'] as const) {
      const { dependencies, spies } = setup({ claimResult: { status } });
      const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
      expect(report.browserClosed, status).toBe(true);
      expect(report.browserSettled, status).toBe(true);
      expect(spies.releaseBatch, status).toHaveBeenCalledWith(
        acquisition.batchToken,
        'after_settlement',
        expect.any(Number)
      );
      expect(spies.put, status).not.toHaveBeenCalled();
    }
  });

  test('Browser unavailability refunds the untouched reservation and opens no browser', async () => {
    const { dependencies, spies } = setup({ browserAvailable: false });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({ status: 'systemic_stop', browserOpened: false });
    expect(spies.releaseBatch).toHaveBeenCalledWith(
      acquisition.batchToken,
      'no_browser',
      expect.any(Number)
    );
    expect(spies.openBrowser).not.toHaveBeenCalled();
  });

  test('a launch failure keeps the conservative reservation and opens no replacement', async () => {
    const { dependencies, spies } = setup();
    dependencies.openBrowser = async () => await Promise.reject(new Error('launch failed'));
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report.status).toBe('systemic_stop');
    expect(spies.releaseBatch).not.toHaveBeenCalled();
    expect(spies.settleBrowser).not.toHaveBeenCalled();
  });

  test('cleanup timeout leaves Browser usage conservatively unsettled', async () => {
    const { dependencies, spies } = setup({ close: async () => await new Promise(() => {}) });
    const report = await executeOwnedBatch(
      dependencies,
      { ...config, browserCleanupGraceMs: 1 },
      acquisition,
      NOW
    );
    expect(report).toMatchObject({ status: 'systemic_stop', browserClosed: false });
    expect(spies.settleBrowser).not.toHaveBeenCalled();
  });

  test('a save observed during capture is rejected before R2', async () => {
    const { dependencies, spies } = setup({ revalidateStatus: 'stale' });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report.status).toBe('stale');
    expect(spies.release).toHaveBeenCalled();
    expect(spies.put).not.toHaveBeenCalled();
  });

  test('R2 failure and completion failure checkpoint a recoverable exact failure', async () => {
    const r2 = setup({ put: async () => await Promise.reject(new Error('R2 unavailable')) });
    expect((await executeOwnedBatch(r2.dependencies, config, acquisition, NOW)).status).toBe(
      'failed'
    );
    expect(r2.spies.fail).toHaveBeenCalled();

    const completion = setup({ complete: async () => await Promise.reject(new Error('lost')) });
    const report = await executeOwnedBatch(completion.dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({ status: 'failed', uploaded: true, completed: false });
    expect(completion.spies.fail).toHaveBeenCalled();
  });

  test('an oversized PDF fails before R2 and is checkpointed', async () => {
    const { dependencies, spies } = setup({ pdfBytes: 4 });
    const report = await executeOwnedBatch(
      dependencies,
      { ...config, pdfMaxBytes: 3 },
      acquisition,
      NOW
    );
    expect(report.status).toBe('failed');
    expect(spies.put).not.toHaveBeenCalled();
    expect(spies.fail).toHaveBeenCalled();
  });

  test.each([
    ['wrong page count', { pdfPageCount: 1 }],
    ['wrong page width', { pdfWidthMm: 149 }],
    ['wrong page height', { pdfHeightMm: 196 }],
  ] as const)('%s is rejected before any R2 write', async (_label, inspection) => {
    const { dependencies, spies } = setup(inspection);
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report.status).toBe('failed');
    expect(spies.put).not.toHaveBeenCalled();
    expect(spies.fail).toHaveBeenCalled();
  });

  test.each([
    'page error',
    'request failure',
    'HTTP 404',
  ])('capture diagnostic %s fails before R2', async (diagnostic) => {
    const { dependencies, spies } = setup({
      captureError: new Error(`Capture diagnostics rejected: ${diagnostic}`),
    });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report.status).toBe('failed');
    expect(spies.put).not.toHaveBeenCalled();
    expect(spies.fail).toHaveBeenCalled();
  });

  test('returned reports redact signed artwork URLs before structured logging', async () => {
    const signedUrl =
      'https://signed-user:SECRET_PASSWORD@cdn.example.com/private/SECRET_PATH/art.png?token=SECRET_QUERY#SECRET_FRAGMENT';
    const { dependencies } = setup({ captureError: new Error(`Capture failed: ${signedUrl}`) });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    const serialized = JSON.stringify(report);
    expect(serialized).toContain('https://cdn.example.com/<redacted>');
    for (const secret of [
      'signed-user',
      'SECRET_PASSWORD',
      'SECRET_PATH',
      'SECRET_QUERY',
      'SECRET_FRAGMENT',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test('a lost claim response is replayed and the recovered exact claim is failed', async () => {
    let calls = 0;
    const recovered = { ...claim, replay: true };
    const { dependencies, spies } = setup({
      claim: async () => {
        calls += 1;
        if (calls === 1) throw new Error('response lost after commit');
        return recovered;
      },
    });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({ status: 'failed', browserClosed: true, browserSettled: true });
    expect(spies.fail).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: claim.targetId, claimToken: claim.claimToken }),
      expect.stringMatching(/recovered the exact claim/),
      expect.any(Number)
    );
    expect(spies.releaseBatch).not.toHaveBeenCalled();
    expect(spies.put).not.toHaveBeenCalled();
  });

  test('an unprovable claim outcome settles closed-browser usage but retains the claim fence', async () => {
    const { dependencies, spies } = setup({
      claim: async () => await Promise.reject(new Error('response unavailable')),
    });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({
      status: 'systemic_stop',
      browserClosed: true,
      browserSettled: true,
    });
    expect(spies.fail).not.toHaveBeenCalled();
    expect(spies.settleBrowser).toHaveBeenCalledOnce();
    expect(spies.releaseBatch).not.toHaveBeenCalled();
  });

  test('real client and HTTP settle a measurable post-lifecycle overrun at actual usage', async () => {
    let current = NOW;
    let settlementBody: Record<string, unknown> | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      settlementBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ ok: true, status: 'settled' });
    };
    const client = new ConvexPublisherClient({
      pollUrl: 'https://convex.example.com/poll',
      executorBaseUrl: 'https://convex.example.com/executor',
      pollToken: 'poll-token',
      executorToken: 'executor-token',
      fetcher,
      now: () => current,
    });
    const { dependencies, spies } = setup({ now: () => current });
    dependencies.client.settleBrowser = client.settleBrowser.bind(client);
    dependencies.openBrowser = async () => ({
      capture: spies.capture,
      close: async () => {
        current = NOW + 481_000;
      },
    });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(settlementBody).toMatchObject({
      schemaVersion: 1,
      batchToken: acquisition.batchToken,
      measuredBrowserMs: 481_000,
    });
    expect(report.status).toBe('systemic_stop');
    expect(report).toMatchObject({ browserClosed: true, browserSettled: true });
    expect(report.error).toMatch(/481000 ms > 480000 ms/);
  });

  test('an overrun beyond the settlement window keeps the reservation unsettled', async () => {
    let current = NOW;
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true, status: 'settled' }));
    const client = new ConvexPublisherClient({
      pollUrl: 'https://convex.example.com/poll',
      executorBaseUrl: 'https://convex.example.com/executor',
      pollToken: 'poll-token',
      executorToken: 'executor-token',
      fetcher,
      now: () => current,
    });
    const { dependencies, spies } = setup({ now: () => current });
    dependencies.client.settleBrowser = client.settleBrowser.bind(client);
    dependencies.openBrowser = async () => ({
      capture: spies.capture,
      close: async () => {
        current = NOW + 520_000;
      },
    });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(report).toMatchObject({
      status: 'systemic_stop',
      browserClosed: true,
      browserSettled: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(spies.releaseBatch).not.toHaveBeenCalled();
  });

  test('a stalled real HTTP settlement times out and keeps the reservation unsettled', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const fetcher: typeof fetch = async () => await new Promise<Response>(() => {});
      const client = new ConvexPublisherClient({
        pollUrl: 'https://convex.example.com/poll',
        executorBaseUrl: 'https://convex.example.com/executor',
        pollToken: 'poll-token',
        executorToken: 'executor-token',
        fetcher,
        now: Date.now,
      });
      const { dependencies, spies } = setup({ now: Date.now });
      dependencies.client.settleBrowser = client.settleBrowser.bind(client);
      dependencies.openBrowser = async () => ({
        capture: spies.capture,
        close: async () => {
          vi.setSystemTime(NOW + 481_000);
        },
      });
      const execution = executeOwnedBatch(dependencies, config, acquisition, NOW);
      await vi.advanceTimersByTimeAsync(30_000);
      const report = await execution;
      expect(report).toMatchObject({
        status: 'systemic_stop',
        browserClosed: true,
        browserSettled: false,
      });
      expect(spies.releaseBatch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('one absolute deadline stops a stalled capture and never opens a replacement browser', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const { dependencies, spies } = setup({ now: Date.now });
      const openBrowser = vi.fn(async () => ({
        capture: async () => await new Promise<never>(() => {}),
        close: spies.close,
      }));
      dependencies.openBrowser = openBrowser;
      const execution = executeOwnedBatch(
        dependencies,
        {
          ...config,
          softDeadlineMs: 6_000,
          browserCaptureTimeoutMs: 100,
          browserCleanupGraceMs: 100,
        },
        acquisition,
        NOW
      );
      await vi.advanceTimersByTimeAsync(100);
      const report = await execution;
      expect(report).toMatchObject({
        status: 'systemic_stop',
        error: expect.stringMatching(/deadline/i),
      });
      expect(openBrowser).toHaveBeenCalledOnce();
      expect(spies.close).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  test('an unprovable post-ownership Convex header stall still closes, settles, and returns', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const fetcher: typeof fetch = async () => await new Promise<Response>(() => {});
      const { dependencies, spies } = setup({
        now: Date.now,
        claim: async (_batchToken, deadlineAt) =>
          (await postJson(
            'https://convex.example.com/claim',
            'executor-token',
            {},
            {
              fetcher,
              deadlineAt,
            }
          )) as typeof claim,
      });
      const execution = executeOwnedBatch(
        dependencies,
        {
          ...config,
          softDeadlineMs: 6_000,
          browserCaptureTimeoutMs: 100,
          browserCleanupGraceMs: 100,
        },
        acquisition,
        NOW
      );
      await vi.advanceTimersByTimeAsync(1_000);
      const report = await execution;
      expect(report).toMatchObject({
        status: 'systemic_stop',
        browserClosed: true,
        browserSettled: true,
      });
      expect(spies.close).toHaveBeenCalledOnce();
      expect(spies.settleBrowser).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  test.each([
    'after_lease',
    'after_browser_open',
    'after_claim',
    'after_render',
    'before_upload',
    'after_upload',
    'before_completion',
    'after_completion',
  ] as const)('failure injection at %s leaves a bounded owned outcome', async (point) => {
    const { dependencies, spies } = setup({ fault: point });
    const report = await executeOwnedBatch(dependencies, config, acquisition, NOW);
    expect(['failed', 'systemic_stop', 'completed']).toContain(report.status);
    if (point === 'after_lease') {
      expect(spies.openBrowser).not.toHaveBeenCalled();
      expect(spies.releaseBatch).toHaveBeenCalledWith(
        acquisition.batchToken,
        'no_browser',
        expect.any(Number)
      );
    }
    if (point === 'after_completion') {
      expect(report).toMatchObject({ status: 'completed', completed: true });
    }
  });
});
