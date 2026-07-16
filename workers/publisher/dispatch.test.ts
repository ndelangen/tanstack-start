import { describe, expect, test, vi } from 'vitest';

import { createWakeUp, dispatchWakeUp, parseWakeUp } from './dispatch';

const NOW = Date.parse('2026-07-16T12:00:00.000Z');
const TRIGGER = '10a5318c-e0f2-49c6-bd19-5221a80643f7';

describe('publisher Cron wake-up contract', () => {
  test('creates and parses only the minimal exact payload', () => {
    const wakeUp = createWakeUp(NOW, TRIGGER);
    expect(parseWakeUp(wakeUp)).toEqual(wakeUp);
    expect(() => parseWakeUp({ ...wakeUp, targetId: 'forbidden' })).toThrow(/minimal contract/);
    expect(() => parseWakeUp({ ...wakeUp, schemaVersion: 2 })).toThrow(/minimal contract/);
  });

  test('empty poll sends no Queue message', async () => {
    const send = vi.fn();
    await expect(
      dispatchWakeUp({ poll: async () => 'empty', send }, createWakeUp(NOW, TRIGGER))
    ).resolves.toBe('empty');
    expect(send).not.toHaveBeenCalled();
  });

  test('positive poll sends exactly one minimal wake-up', async () => {
    const send = vi.fn(async () => undefined);
    const wakeUp = createWakeUp(NOW, TRIGGER);
    await expect(dispatchWakeUp({ poll: async () => 'eligible', send }, wakeUp)).resolves.toBe(
      'enqueued'
    );
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(wakeUp);
  });

  test('Queue send failure propagates to the Cron boundary', async () => {
    const failure = new Error('Queue unavailable');
    await expect(
      dispatchWakeUp(
        { poll: async () => 'eligible', send: async () => await Promise.reject(failure) },
        createWakeUp(NOW, TRIGGER)
      )
    ).rejects.toBe(failure);
  });
});
