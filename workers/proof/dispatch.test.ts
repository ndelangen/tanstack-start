import { describe, expect, test, vi } from 'vitest';

import {
  createProofWakeUp,
  dispatchEligibleProofWakeUp,
  parseProofEligibility,
  parseProofWakeUp,
  pollConvexProofEligibility,
} from './dispatch';

const wakeUp = createProofWakeUp(
  Date.parse('2026-07-16T12:00:00.000Z'),
  '10a5318c-e0f2-49c6-bd19-5221a80643f7'
);

describe('proof wake-up contract', () => {
  test('contains only scheduling diagnostics and no asset authority', () => {
    expect(wakeUp).toEqual({
      schemaVersion: 1,
      scheduledCutoff: '2026-07-16T12:00:00.000Z',
      triggerId: '10a5318c-e0f2-49c6-bd19-5221a80643f7',
    });
    expect(parseProofWakeUp(wakeUp)).toEqual(wakeUp);
  });

  test.each([
    { ...wakeUp, schemaVersion: 2 },
    { ...wakeUp, scheduledCutoff: 'today' },
    { ...wakeUp, triggerId: 'diagnostic' },
    { ...wakeUp, factionId: 'asset-payload-is-forbidden' },
  ])('rejects an invalid or asset-bearing Queue message', (value) => {
    expect(() => parseProofWakeUp(value)).toThrow(/wake-up/);
  });

  test('requires a correlated eligibility acknowledgment', () => {
    expect(parseProofEligibility({ ok: true, eligibility: 'eligible', ...wakeUp }, wakeUp)).toBe(
      'eligible'
    );
    expect(() =>
      parseProofEligibility(
        { ok: true, eligibility: 'eligible', ...wakeUp, triggerId: crypto.randomUUID() },
        wakeUp
      )
    ).toThrow(/mismatched/);
  });
});

describe('Cron dispatch boundary', () => {
  test('empty eligibility sends nothing', async () => {
    const send = vi.fn(async () => undefined);
    const result = await dispatchEligibleProofWakeUp({ poll: async () => 'empty', send }, wakeUp);
    expect(result).toBe('empty');
    expect(send).not.toHaveBeenCalled();
  });

  test('eligible sends exactly one wake-up', async () => {
    const send = vi.fn(async () => undefined);
    const result = await dispatchEligibleProofWakeUp(
      { poll: async () => 'eligible', send },
      wakeUp
    );
    expect(result).toBe('enqueued');
    expect(send).toHaveBeenCalledExactlyOnceWith(wakeUp);
  });

  test('poll and send failures propagate without any browser dependency', async () => {
    const send = vi.fn(async () => {
      throw new Error('Queue unavailable');
    });
    await expect(
      dispatchEligibleProofWakeUp({ poll: async () => 'eligible', send }, wakeUp)
    ).rejects.toThrow('Queue unavailable');
    expect(send).toHaveBeenCalledOnce();
  });

  test('posts the minimal message to the Convex eligibility endpoint', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(wakeUp);
      return Response.json({ ok: true, eligibility: 'empty', ...wakeUp });
    });
    await expect(
      pollConvexProofEligibility(
        { url: 'https://proof.convex.site/eligibility', token: 'secret', fetcher },
        wakeUp
      )
    ).resolves.toBe('empty');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
