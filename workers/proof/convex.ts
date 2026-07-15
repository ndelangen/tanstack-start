import type { ProofCheckpoint } from './core';

export type ConvexProofCheckpointAcknowledgement = {
  ok: true;
  serverTime: number;
  runId: string;
  phase: ProofCheckpoint['phase'];
  outcome: ProofCheckpoint['outcome'];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseConvexProofCheckpointAcknowledgement(
  value: unknown,
  checkpoint: ProofCheckpoint
): ConvexProofCheckpointAcknowledgement {
  if (!isRecord(value)) {
    throw new Error('Convex checkpoint acknowledgment must be an object');
  }
  if (value.ok !== true) {
    throw new Error('Convex checkpoint acknowledgment must set ok=true');
  }
  if (typeof value.serverTime !== 'number' || !Number.isFinite(value.serverTime)) {
    throw new Error('Convex checkpoint acknowledgment has an invalid serverTime');
  }
  if (value.runId !== checkpoint.runId) {
    throw new Error('Convex checkpoint acknowledgment runId does not match the request');
  }
  if (value.phase !== checkpoint.phase) {
    throw new Error('Convex checkpoint acknowledgment phase does not match the request');
  }
  if (value.outcome !== checkpoint.outcome) {
    throw new Error('Convex checkpoint acknowledgment outcome does not match the request');
  }

  return {
    ok: true,
    serverTime: value.serverTime,
    runId: checkpoint.runId,
    phase: checkpoint.phase,
    outcome: checkpoint.outcome,
  };
}

export async function sendConvexProofCheckpoint(
  options: {
    url: string;
    token: string;
    fetcher?: typeof fetch;
  },
  checkpoint: ProofCheckpoint
): Promise<ConvexProofCheckpointAcknowledgement> {
  const response = await (options.fetcher ?? fetch)(options.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkpoint),
  });
  if (!response.ok) {
    throw new Error(`Convex checkpoint returned ${response.status}: ${await response.text()}`);
  }

  let acknowledgement: unknown;
  try {
    acknowledgement = await response.json();
  } catch {
    throw new Error('Convex checkpoint acknowledgment is not valid JSON');
  }
  return parseConvexProofCheckpointAcknowledgement(acknowledgement, checkpoint);
}
