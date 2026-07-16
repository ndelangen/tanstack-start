export const WAKE_UP_SCHEMA_VERSION = 1 as const;

export type PublisherWakeUp = {
  schemaVersion: typeof WAKE_UP_SCHEMA_VERSION;
  scheduledCutoff: string;
  triggerId: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function uuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function createWakeUp(scheduledTime: number, triggerId: string): PublisherWakeUp {
  if (!Number.isFinite(scheduledTime) || !uuid(triggerId)) {
    throw new Error('Scheduled cutoff and diagnostic trigger id must be valid');
  }
  return {
    schemaVersion: WAKE_UP_SCHEMA_VERSION,
    scheduledCutoff: new Date(scheduledTime).toISOString(),
    triggerId,
  };
}

export function parseWakeUp(value: unknown): PublisherWakeUp {
  if (
    !record(value) ||
    !exactKeys(value, ['schemaVersion', 'scheduledCutoff', 'triggerId']) ||
    value.schemaVersion !== WAKE_UP_SCHEMA_VERSION ||
    !isoDateTime(value.scheduledCutoff) ||
    !uuid(value.triggerId)
  ) {
    throw new Error('Queue wake-up must be the exact supported minimal contract');
  }
  return {
    schemaVersion: WAKE_UP_SCHEMA_VERSION,
    scheduledCutoff: value.scheduledCutoff,
    triggerId: value.triggerId,
  };
}

export async function dispatchWakeUp(
  dependencies: {
    poll(wakeUp: PublisherWakeUp): Promise<'empty' | 'eligible'>;
    send(wakeUp: PublisherWakeUp): Promise<void>;
  },
  wakeUp: PublisherWakeUp
): Promise<'empty' | 'enqueued'> {
  if ((await dependencies.poll(wakeUp)) === 'empty') return 'empty';
  await dependencies.send(wakeUp);
  return 'enqueued';
}
