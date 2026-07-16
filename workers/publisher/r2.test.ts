import { describe, expect, test, vi } from 'vitest';

import type { ClaimedTarget } from './convex';
import {
  type AssetBucket,
  ConditionalWriteConflictError,
  conditionallyPutFactionSheet,
} from './r2';
import { fakeR2Object } from './test-helpers';

const NOW = Date.parse('2026-07-16T12:00:00.000Z');
const claim: ClaimedTarget = {
  status: 'claimed',
  replay: false,
  targetId: 'target',
  factionId: 'faction',
  assetType: 'faction_sheet',
  batchToken: 'batch-token-0000000000000001',
  claimToken: 'claim-token-0000000000000001',
  generation: 2,
  rendererVersion: 'faction-sheet-v1',
  leaseExpiresAt: NOW + 720_000,
  payloadHash: 'a'.repeat(64),
  renderCapability: 'capability-token-0000000000000001',
  renderCapabilityExpiresAt: NOW + 300_000,
};

function object(etag: string, size: number, customMetadata: Record<string, string>): R2Object {
  return fakeR2Object({ etag, size, customMetadata, uploaded: new Date(NOW) });
}

describe('stable R2 write fencing', () => {
  test('uses absence precondition for the first stable write', async () => {
    const put = vi.fn(async (_key: string, _value: Uint8Array, _options: R2PutOptions) =>
      object('new-etag', 3, {})
    );
    const bucket: AssetBucket = { head: async () => null, put };
    await expect(
      conditionallyPutFactionSheet(bucket, claim, new Uint8Array([1, 2, 3]))
    ).resolves.toEqual({ key: 'factions/faction/sheet.pdf', etag: 'new-etag' });
    const options = put.mock.calls[0]?.[2];
    expect(options?.onlyIf).toBeInstanceOf(Headers);
    expect((options?.onlyIf as Headers).get('If-None-Match')).toBe('*');
  });

  test('uses observed ETag and never hides a conditional conflict', async () => {
    const existing = object('old-etag', 3, {
      generation: '1',
      payloadHash: 'b'.repeat(64),
    });
    const put = vi.fn(async (_key: string, _value: Uint8Array, _options: R2PutOptions) => null);
    const bucket: AssetBucket = { head: async () => existing, put };
    await expect(
      conditionallyPutFactionSheet(bucket, claim, new Uint8Array([1, 2, 3]))
    ).rejects.toBeInstanceOf(ConditionalWriteConflictError);
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0]?.[2].onlyIf).toEqual({ etagMatches: 'old-etag' });
  });

  test('rejects a delayed attempt behind newer diagnostic bytes', async () => {
    const put = vi.fn(async (_key: string, _value: Uint8Array, _options: R2PutOptions) =>
      object('unused', 1, {})
    );
    const bucket: AssetBucket = {
      head: async () => object('newer', 3, { generation: '3' }),
      put,
    };
    await expect(conditionallyPutFactionSheet(bucket, claim, new Uint8Array([1]))).rejects.toThrow(
      /newer/
    );
    expect(put).not.toHaveBeenCalled();
  });
});
