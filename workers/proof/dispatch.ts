export const PROOF_WAKE_UP_SCHEMA_VERSION = 1 as const;

export type ProofWakeUp = {
  schemaVersion: typeof PROOF_WAKE_UP_SCHEMA_VERSION;
  scheduledCutoff: string;
  triggerId: string;
};

export type ProofEligibility = 'empty' | 'eligible';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function createProofWakeUp(scheduledTime: number, triggerId: string): ProofWakeUp {
  if (!Number.isFinite(scheduledTime)) {
    throw new Error('Scheduled cutoff must be finite');
  }
  if (!isUuid(triggerId)) {
    throw new Error('Diagnostic trigger id must be a UUID');
  }
  return {
    schemaVersion: PROOF_WAKE_UP_SCHEMA_VERSION,
    scheduledCutoff: new Date(scheduledTime).toISOString(),
    triggerId,
  };
}

export function parseProofWakeUp(value: unknown): ProofWakeUp {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'scheduledCutoff', 'triggerId'])) {
    throw new Error(
      'Queue wake-up must contain only schemaVersion, scheduledCutoff, and triggerId'
    );
  }
  if (value.schemaVersion !== PROOF_WAKE_UP_SCHEMA_VERSION) {
    throw new Error('Queue wake-up has an unsupported schemaVersion');
  }
  if (!isIsoDateTime(value.scheduledCutoff)) {
    throw new Error('Queue wake-up has an invalid scheduledCutoff');
  }
  if (!isUuid(value.triggerId)) {
    throw new Error('Queue wake-up has an invalid triggerId');
  }
  return {
    schemaVersion: PROOF_WAKE_UP_SCHEMA_VERSION,
    scheduledCutoff: value.scheduledCutoff,
    triggerId: value.triggerId,
  };
}

export function parseProofEligibility(value: unknown, wakeUp: ProofWakeUp): ProofEligibility {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['ok', 'eligibility', 'schemaVersion', 'scheduledCutoff', 'triggerId']) ||
    value.ok !== true ||
    (value.eligibility !== 'empty' && value.eligibility !== 'eligible') ||
    value.schemaVersion !== wakeUp.schemaVersion ||
    value.scheduledCutoff !== wakeUp.scheduledCutoff ||
    value.triggerId !== wakeUp.triggerId
  ) {
    throw new Error('Convex proof eligibility acknowledgment is invalid or mismatched');
  }
  return value.eligibility;
}

export async function pollConvexProofEligibility(
  options: { url: string; token: string; fetcher?: typeof fetch },
  wakeUp: ProofWakeUp
): Promise<ProofEligibility> {
  const response = await (options.fetcher ?? fetch)(options.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wakeUp),
  });
  if (!response.ok) {
    throw new Error(
      `Convex eligibility poll returned ${response.status}: ${await response.text()}`
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Convex eligibility acknowledgment is not valid JSON');
  }
  return parseProofEligibility(body, wakeUp);
}

export async function dispatchEligibleProofWakeUp(
  dependencies: {
    poll: (wakeUp: ProofWakeUp) => Promise<ProofEligibility>;
    send: (wakeUp: ProofWakeUp) => Promise<void>;
  },
  wakeUp: ProofWakeUp
): Promise<'empty' | 'enqueued'> {
  if ((await dependencies.poll(wakeUp)) === 'empty') {
    return 'empty';
  }
  await dependencies.send(wakeUp);
  return 'enqueued';
}
