import { describe, expect, test, vi } from 'vitest';

import type { PublisherConfig } from './config';
import type { AcquireResult, ClaimedTarget, ExactClaim } from './convex';
import { createWakeUp } from './dispatch';
import { PublisherHttpError } from './http';
import {
  consumePublisherMessage,
  type PublisherQueueMessage,
  type QueueDependencies,
} from './queue';
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
  browserCleanupGraceMs: 15_000,
  pdfMaxBytes: 2_000_000,
  queueMaxPreOwnershipAttempts: 2,
  queueRetryDelaySeconds: 60,
  r2StorageCeilingBytes: 8_000_000_000,
  r2EstimatedInventoryBytes: 1_000,
  r2InventoryObservedAtMs: NOW,
  r2InventoryMaxAgeMs: 60_000,
  r2UnaccountedWriteBudgetBytes: 200_000_000,
};

function message(body: unknown, attempts = 1) {
  const ack = vi.fn();
  const retry = vi.fn();
  return {
    value: { id: 'message-one', attempts, body, ack, retry } satisfies PublisherQueueMessage,
    ack,
    retry,
  };
}

function dependencies(acquire: () => Promise<AcquireResult>): QueueDependencies {
  const claim: ClaimedTarget = {
    status: 'claimed',
    replay: false,
    targetId: 'target',
    factionId: 'faction',
    assetType: 'faction_sheet',
    batchToken: 'batch-token-0000000000000001',
    claimToken: 'claim-token-0000000000000001',
    generation: 1,
    rendererVersion: 'faction-sheet-v1',
    leaseExpiresAt: NOW + 720_000,
    payloadHash: 'a'.repeat(64),
    renderCapability: 'render-capability-token-000000001',
    renderCapabilityExpiresAt: NOW + 300_000,
  };
  const stored = fakeR2Object({ etag: 'etag', size: 1, uploaded: new Date(NOW) });
  const bucket: AssetBucket = {
    head: async () => null,
    put: async () => stored,
  };
  return {
    client: {
      acquire,
      claim: async () => claim,
      settleBrowser: async () => 'settled',
      releaseBatch: async () => 'released',
      revalidate: async () => ({
        status: 'valid',
        leaseExpiresAt: claim.leaseExpiresAt,
        factionId: claim.factionId,
        assetType: claim.assetType,
        payloadHash: claim.payloadHash,
      }),
      complete: async (_claim: ExactClaim, _etag: string, _bytes: number) => 'completed',
      fail: async (_claim: ExactClaim, _error: string) => 'failed',
      release: async (_claim: ExactClaim) => 'released',
    },
    owned: {
      bucket,
      browserAvailable: async () => true,
      openBrowser: async () => ({
        capture: async () => ({
          bytes: new Uint8Array([1]),
          pageCount: 2,
          pageWidthMm: 150,
          pageHeightMm: 195,
          consoleErrors: [],
          requestFailures: [],
          pageErrors: [],
          httpErrors: [],
        }),
        close: async () => undefined,
      }),
      now: () => NOW,
    },
    now: () => NOW,
    log: vi.fn(),
  };
}

describe('Queue acknowledgement and retry policy', () => {
  const wakeUp = createWakeUp(NOW, '10a5318c-e0f2-49c6-bd19-5221a80643f7');

  test('invalid messages are acknowledged before Convex or Browser work', async () => {
    const delivery = message({ targetId: 'forbidden' });
    const acquire = vi.fn(async () => ({ status: 'busy' as const }));
    await expect(
      consumePublisherMessage(delivery.value, config, dependencies(acquire))
    ).resolves.toEqual({ action: 'ack', reason: 'invalid' });
    expect(delivery.ack).toHaveBeenCalledOnce();
    expect(acquire).not.toHaveBeenCalled();
  });

  test.each([
    { status: 'empty', reason: 'no_eligible_work' },
    { status: 'busy', leaseExpiresAt: NOW + 1 },
  ] as const)('$status acquisition is acknowledged without Browser work', async (result) => {
    const delivery = message(wakeUp);
    const deps = dependencies(async () => result);
    const open = vi.spyOn(deps.owned, 'openBrowser');
    const outcome = await consumePublisherMessage(delivery.value, config, deps);
    expect(outcome).toMatchObject({ action: 'ack', reason: result.status });
    expect(delivery.ack).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  test('one transient pre-ownership failure retries with bounded delay', async () => {
    const delivery = message(wakeUp, 1);
    const deps = dependencies(async () => {
      throw new PublisherHttpError('temporary', true, 503);
    });
    await expect(consumePublisherMessage(delivery.value, config, deps)).resolves.toEqual({
      action: 'retry',
      reason: 'transient_before_ownership',
    });
    expect(delivery.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    expect(delivery.ack).not.toHaveBeenCalled();
  });

  test('Queue redelivery reuses the same caller-supplied acquisition token', async () => {
    const acquire = vi.fn(async () => ({ status: 'busy' as const }));
    const first = message(wakeUp, 1);
    const second = message(wakeUp, 2);
    await consumePublisherMessage(first.value, config, dependencies(acquire));
    await consumePublisherMessage(second.value, config, dependencies(acquire));
    expect(acquire).toHaveBeenNthCalledWith(1, wakeUp.triggerId, NOW + config.softDeadlineMs);
    expect(acquire).toHaveBeenNthCalledWith(2, wakeUp.triggerId, NOW + config.softDeadlineMs);
  });

  test('reuses the same authenticated acquisition token after a lost acquire response', async () => {
    const acquired: Extract<AcquireResult, { status: 'acquired' }> = {
      status: 'acquired',
      replay: true,
      batchToken: wakeUp.triggerId,
      leaseExpiresAt: NOW + 720_000,
      browserReservationMs: 480_000,
      dailyBrowserMs: 480_000,
    };
    const acquire = vi
      .fn()
      .mockRejectedValueOnce(new PublisherHttpError('lost response', true))
      .mockResolvedValueOnce(acquired);

    const first = message(wakeUp, 1);
    await consumePublisherMessage(first.value, config, dependencies(acquire));
    const second = message(wakeUp, 2);
    await consumePublisherMessage(second.value, config, dependencies(acquire));

    expect(acquire).toHaveBeenNthCalledWith(1, wakeUp.triggerId, NOW + config.softDeadlineMs);
    expect(acquire).toHaveBeenNthCalledWith(2, wakeUp.triggerId, NOW + config.softDeadlineMs);
    expect(first.retry).toHaveBeenCalledOnce();
    expect(second.ack).toHaveBeenCalledOnce();
  });

  test('retry exhaustion and permanent errors are acknowledged', async () => {
    for (const error of [
      new PublisherHttpError('temporary', true, 503),
      new PublisherHttpError('invalid', false, 400),
    ]) {
      const delivery = message(wakeUp, 2);
      const deps = dependencies(async () => {
        throw error;
      });
      expect((await consumePublisherMessage(delivery.value, config, deps)).action).toBe('ack');
      expect(delivery.ack).toHaveBeenCalledOnce();
      expect(delivery.retry).not.toHaveBeenCalled();
    }
  });

  test('a consumer-owned outcome is always acknowledged and never Queue-retried', async () => {
    const delivery = message(wakeUp);
    const acquired: Extract<AcquireResult, { status: 'acquired' }> = {
      status: 'acquired',
      replay: false,
      batchToken: 'batch-token-0000000000000001',
      leaseExpiresAt: NOW + 720_000,
      browserReservationMs: 480_000,
      dailyBrowserMs: 480_000,
    };
    const result = await consumePublisherMessage(
      delivery.value,
      config,
      dependencies(async () => acquired)
    );
    expect(result).toMatchObject({
      action: 'ack',
      reason: 'consumer_owned_outcome',
      report: { status: 'completed' },
    });
    expect(delivery.ack).toHaveBeenCalledOnce();
    expect(delivery.retry).not.toHaveBeenCalled();
  });
});
