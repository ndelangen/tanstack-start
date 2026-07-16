import { describe, expect, test } from 'vitest';

import {
  boundedPublisherTelemetryEvent,
  MAX_CORRELATION_INPUT_BYTES,
  MAX_TELEMETRY_EVENT_BYTES,
  safeTelemetryCorrelationHash,
  telemetryCorrelationHash,
} from './telemetry';

describe('bounded publisher telemetry primitives', () => {
  test('domain-separates equal raw correlation values', async () => {
    const value = 'same-raw-correlation-value';
    const hashes = await Promise.all([
      telemetryCorrelationHash('batch', value),
      telemetryCorrelationHash('claim', value),
      telemetryCorrelationHash('browser_session', value),
    ]);
    expect(new Set(hashes)).toHaveProperty('size', 3);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('rejects empty and oversized raw correlation values before hashing', async () => {
    await expect(telemetryCorrelationHash('batch', '')).rejects.toThrow(/byte limit/);
    const oversized = 'x'.repeat(MAX_CORRELATION_INPUT_BYTES + 1);
    await expect(telemetryCorrelationHash('claim', oversized)).rejects.toThrow(/byte limit/);
    await expect(safeTelemetryCorrelationHash('browser_session', oversized)).resolves.toBeNull();
  });

  test('sanitizes and bounds a complete oversized telemetry event', () => {
    const secretSentinels = [
      'Bearer SECRET_BEARER_TOKEN',
      'SESSION_SECRET_SENTINEL',
      'PAYLOAD_SECRET_SENTINEL',
    ];
    const bounded = boundedPublisherTelemetryEvent({
      event: 'asset_publisher_invocation_telemetry',
      diagnostic: `${secretSentinels.join(' ')} ${'x'.repeat(100_000)}`,
      safeMeasurements: 'x'.repeat(100_000),
    });
    const serialized = JSON.stringify(bounded);
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThanOrEqual(
      MAX_TELEMETRY_EVENT_BYTES
    );
    expect(bounded).toMatchObject({ event: 'asset_publisher_invocation_telemetry' });
    expect(bounded).not.toHaveProperty('diagnostic');
    expect(bounded).not.toHaveProperty('safeMeasurements');
    for (const sentinel of secretSentinels) expect(serialized).not.toContain(sentinel);
  });

  test('rejects arbitrary failure classes and secret-bearing diagnostic fields', () => {
    const bounded = boundedPublisherTelemetryEvent({
      event: 'asset_publisher_item_telemetry',
      failureClass: 'Bearer SECRET_BEARER_TOKEN',
      error: 'SESSION_SECRET_SENTINEL',
      payload: 'PAYLOAD_SECRET_SENTINEL',
      sessionId: 'SESSION_ID_SENTINEL',
      note: 'Bearer UNKNOWN_KEY_SENTINEL',
      nested: { message: 'Bearer NESTED_SENTINEL' },
      item: {
        rendererVersion: 'Bearer SECRET_RENDERER_TOKEN',
        rendererMismatch: true,
        failureClass: 'Bearer ITEM_FAILURE_SENTINEL',
      },
    });
    const serialized = JSON.stringify(bounded);
    expect(bounded).toMatchObject({
      event: 'asset_publisher_item_telemetry',
      item: { rendererMismatch: true, failureClass: null },
    });
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('rendererVersion');
    expect(serialized).not.toContain('note');
    expect(serialized).not.toContain('nested');
  });
});
