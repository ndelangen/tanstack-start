import type { ClaimedTarget } from './convex';

export class ConditionalWriteConflictError extends Error {}
export class StorageGuardError extends Error {}

export type AssetBucket = {
  head(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: Uint8Array,
    options: R2PutOptions & { onlyIf: R2Conditional | Headers }
  ): Promise<R2Object | null>;
};

export function factionSheetKey(factionId: string): string {
  if (!factionId || factionId.includes('/') || factionId.includes('..')) {
    throw new Error('Faction id is invalid for the stable R2 key');
  }
  return `factions/${factionId}/sheet.pdf`;
}

function storedGeneration(object: R2Object): number | undefined {
  const value = object.customMetadata?.generation;
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new StorageGuardError('Stored generation metadata is invalid');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new StorageGuardError('Stored generation metadata is invalid');
  }
  return parsed;
}

export async function conditionallyPutFactionSheet(
  bucket: AssetBucket,
  claim: ClaimedTarget,
  bytes: Uint8Array
): Promise<{ key: string; etag: string }> {
  const key = factionSheetKey(claim.factionId);
  const existing = await bucket.head(key);
  const generation = existing ? storedGeneration(existing) : undefined;
  if (generation !== undefined && generation > claim.generation) {
    throw new ConditionalWriteConflictError('Stored object has a newer diagnostic generation');
  }
  if (
    generation === claim.generation &&
    existing?.customMetadata?.payloadHash !== undefined &&
    existing.customMetadata.payloadHash !== claim.payloadHash
  ) {
    throw new ConditionalWriteConflictError(
      'Stored object has different bytes for the same diagnostic generation'
    );
  }
  const onlyIf = existing ? { etagMatches: existing.etag } : new Headers({ 'If-None-Match': '*' });
  const written = await bucket.put(key, bytes, {
    onlyIf,
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: {
      factionId: claim.factionId,
      assetType: claim.assetType,
      generation: String(claim.generation),
      rendererVersion: claim.rendererVersion,
      payloadHash: claim.payloadHash,
    },
  });
  if (!written) {
    throw new ConditionalWriteConflictError(
      'Stable object changed after HEAD; conditional write was not retried'
    );
  }
  return { key, etag: written.etag };
}
