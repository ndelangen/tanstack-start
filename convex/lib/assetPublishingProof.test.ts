import { describe, expect, test } from 'vitest';

import {
  handleAssetPublishingProofCheckpoint,
  handleAssetPublishingProofEligibility,
} from './assetPublishingProof';

const secret = 'proof-secret';
const baseCheckpoint = {
  runId: '2f521370-9f5c-49c0-b2d9-5616091bbd25',
  at: '2026-07-15T20:00:00.000Z',
  metrics: {
    durationMs: 10,
    browserSessionDurationMs: 0,
    pdfBytes: 0,
    r2Operations: 0,
  },
};

function checkpointRequest(body: unknown, token = secret): Request {
  return new Request('https://proof.convex.site/asset-publishing/proof/checkpoint', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function handle(body: unknown, expectedSecret: string | undefined = secret) {
  return await handleAssetPublishingProofCheckpoint(checkpointRequest(body), {
    expectedSecret,
    now: () => 1_752_612_345_000,
  });
}

function expectNoStore(response: Response): void {
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

describe('asset publishing proof checkpoint endpoint', () => {
  test('is inert when the deployment secret is missing', async () => {
    const response = await handleAssetPublishingProofCheckpoint(
      checkpointRequest({ ...baseCheckpoint, phase: 'before_capture', outcome: 'started' }),
      { expectedSecret: undefined }
    );

    expect(response.status).toBe(404);
    expectNoStore(response);
    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
  });

  test('returns a non-cacheable 404 for an invalid secret', async () => {
    const response = await handleAssetPublishingProofCheckpoint(
      checkpointRequest(
        { ...baseCheckpoint, phase: 'before_capture', outcome: 'started' },
        'wrong-secret'
      ),
      { expectedSecret: secret }
    );

    expect(response.status).toBe(404);
    expectNoStore(response);
  });

  test('returns a bounded non-cacheable 400 for malformed JSON', async () => {
    const response = await handleAssetPublishingProofCheckpoint(
      new Request('https://proof.convex.site/asset-publishing/proof/checkpoint', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: '{not-json',
      }),
      { expectedSecret: secret }
    );

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect((await response.text()).length).toBeLessThan(4_096);
  });

  test.each([
    ['before success', { phase: 'before_capture', outcome: 'success' }],
    ['before failure', { phase: 'before_capture', outcome: 'failed', error: 'failed' }],
    ['after started', { phase: 'after_capture', outcome: 'started' }],
    ['success with error', { phase: 'after_capture', outcome: 'success', error: 'impossible' }],
    ['failure without error', { phase: 'after_capture', outcome: 'failed' }],
    ['failure with empty error', { phase: 'after_capture', outcome: 'failed', error: '   ' }],
    [
      'failure with oversized error',
      { phase: 'after_capture', outcome: 'failed', error: 'x'.repeat(2_001) },
    ],
  ])('rejects the invalid semantic combination: %s', async (_label, combination) => {
    const response = await handle({ ...baseCheckpoint, ...combination });

    expect(response.status).toBe(400);
    expectNoStore(response);
    const text = await response.text();
    expect(text.length).toBeLessThan(4_096);
    expect(JSON.parse(text)).toMatchObject({ error: 'Invalid proof checkpoint' });
  });

  test.each([
    { phase: 'before_capture', outcome: 'started' },
    { phase: 'after_capture', outcome: 'success' },
    { phase: 'after_capture', outcome: 'failed', error: 'capture failed' },
  ] as const)('acknowledges a valid $phase/$outcome checkpoint', async (combination) => {
    const response = await handle({ ...baseCheckpoint, ...combination });

    expect(response.status).toBe(200);
    expectNoStore(response);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      serverTime: 1_752_612_345_000,
      runId: baseCheckpoint.runId,
      phase: combination.phase,
      outcome: combination.outcome,
    });
  });

  test('is stateless and accepts an after checkpoint without stored prior state', async () => {
    const checkpoint = { ...baseCheckpoint, phase: 'after_capture', outcome: 'success' };

    const first = await handle(checkpoint);
    const repeated = await handle(checkpoint);

    expect(first.status).toBe(200);
    expect(repeated.status).toBe(200);
    expectNoStore(first);
    expectNoStore(repeated);
  });
});

describe('asset publishing proof eligibility endpoint', () => {
  const wakeUp = {
    schemaVersion: 1,
    scheduledCutoff: '2026-07-16T12:00:00.000Z',
    triggerId: '10a5318c-e0f2-49c6-bd19-5221a80643f7',
  } as const;

  function eligibilityRequest(body: unknown, token = secret): Request {
    return new Request('https://proof.convex.site/asset-publishing/proof/eligibility', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  test.each([
    'empty',
    'eligible',
  ] as const)('returns the configured stateless %s mode', async (mode) => {
    const response = await handleAssetPublishingProofEligibility(eligibilityRequest(wakeUp), {
      expectedSecret: secret,
      eligibility: mode,
    });

    expect(response.status).toBe(200);
    expectNoStore(response);
    await expect(response.json()).resolves.toEqual({ ok: true, eligibility: mode, ...wakeUp });
  });

  test('is inert without the deployment secret', async () => {
    const response = await handleAssetPublishingProofEligibility(eligibilityRequest(wakeUp), {
      expectedSecret: undefined,
      eligibility: 'eligible',
    });

    expect(response.status).toBe(404);
    expectNoStore(response);
  });

  test.each([
    { ...wakeUp, schemaVersion: 2 },
    { ...wakeUp, scheduledCutoff: 'not-a-date' },
    { ...wakeUp, triggerId: 'not-a-uuid' },
    { ...wakeUp, assetId: 'payloads-do-not-belong-here' },
  ])('rejects a malformed or asset-bearing request', async (body) => {
    const response = await handleAssetPublishingProofEligibility(eligibilityRequest(body), {
      expectedSecret: secret,
      eligibility: 'eligible',
    });

    expect(response.status).toBe(400);
    expectNoStore(response);
  });
});
