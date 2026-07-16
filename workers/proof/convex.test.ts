import { describe, expect, test, vi } from 'vitest';

import { parseConvexProofCheckpointAcknowledgement, sendConvexProofCheckpoint } from './convex';
import type { ProofCheckpoint } from './core';

const checkpoint: ProofCheckpoint = {
  runId: '2f521370-9f5c-49c0-b2d9-5616091bbd25',
  phase: 'before_capture',
  outcome: 'started',
  at: '2026-07-15T20:00:00.000Z',
  metrics: {
    durationMs: 10,
    browserSessionDurationMs: 0,
    pdfBytes: 0,
    r2Operations: 0,
  },
};

const acknowledgement = {
  ok: true,
  serverTime: 1_752_612_345_000,
  runId: checkpoint.runId,
  phase: checkpoint.phase,
  outcome: checkpoint.outcome,
};

describe('Convex proof checkpoint acknowledgment', () => {
  test('accepts and returns a fully correlated acknowledgment', () => {
    expect(parseConvexProofCheckpointAcknowledgement(acknowledgement, checkpoint)).toEqual(
      acknowledgement
    );
  });

  test.each([
    ['non-object', null],
    ['ok=false', { ...acknowledgement, ok: false }],
    ['invalid server time', { ...acknowledgement, serverTime: 'now' }],
    ['wrong run', { ...acknowledgement, runId: 'other-run' }],
    ['wrong phase', { ...acknowledgement, phase: 'after_capture' }],
    ['wrong outcome', { ...acknowledgement, outcome: 'failed' }],
  ])('rejects a malformed or mismatched acknowledgment: %s', (_label, value) => {
    expect(() => parseConvexProofCheckpointAcknowledgement(value, checkpoint)).toThrow(
      /acknowledgment/
    );
  });

  test('parses the HTTP response and rejects a mismatched acknowledgment', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ ...acknowledgement, phase: 'after_capture' })
    );

    await expect(
      sendConvexProofCheckpoint(
        { url: 'https://proof.convex.site', token: 'secret', fetcher },
        checkpoint
      )
    ).rejects.toThrow('phase does not match');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  test('rejects an acknowledgment that is not JSON', async () => {
    const fetcher = vi.fn(async () => new Response('not-json'));

    await expect(
      sendConvexProofCheckpoint(
        { url: 'https://proof.convex.site', token: 'secret', fetcher },
        checkpoint
      )
    ).rejects.toThrow('not valid JSON');
  });
});
