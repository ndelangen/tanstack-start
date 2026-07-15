import { z } from 'zod';

const checkpointMetricsSchema = z.strictObject({
  durationMs: z.number().nonnegative(),
  browserSessionDurationMs: z.number().nonnegative(),
  pdfBytes: z.number().int().nonnegative(),
  r2Operations: z.number().int().nonnegative(),
});

const checkpointBaseShape = {
  runId: z.uuid(),
  at: z.iso.datetime(),
  metrics: checkpointMetricsSchema,
};

export const assetPublishingProofCheckpointSchema = z.discriminatedUnion('outcome', [
  z.strictObject({
    ...checkpointBaseShape,
    phase: z.literal('before_capture'),
    outcome: z.literal('started'),
  }),
  z.strictObject({
    ...checkpointBaseShape,
    phase: z.literal('after_capture'),
    outcome: z.literal('success'),
  }),
  z.strictObject({
    ...checkpointBaseShape,
    phase: z.literal('after_capture'),
    outcome: z.literal('failed'),
    error: z.string().trim().min(1).max(2_000),
  }),
]);

export type AssetPublishingProofCheckpoint = z.infer<typeof assetPublishingProofCheckpointSchema>;

const proofWakeUpSchema = z.strictObject({
  schemaVersion: z.literal(1),
  scheduledCutoff: z.iso.datetime(),
  triggerId: z.uuid(),
});

const MAX_ISSUES = 8;
const MAX_ISSUE_MESSAGE_LENGTH = 200;

function proofResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function matchesProofSecret(request: Request, expectedSecret: string | undefined) {
  if (!expectedSecret) {
    return false;
  }

  const encoder = new TextEncoder();
  const expected = encoder.encode(`Bearer ${expectedSecret}`);
  const actual = encoder.encode(request.headers.get('Authorization') ?? '');
  const [expectedHash, actualHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', expected),
    crypto.subtle.digest('SHA-256', actual),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const actualBytes = new Uint8Array(actualHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ actualBytes[index];
  }
  return difference === 0;
}

export async function handleAssetPublishingProofCheckpoint(
  request: Request,
  options: { expectedSecret: string | undefined; now?: () => number }
): Promise<Response> {
  if (!(await matchesProofSecret(request, options.expectedSecret))) {
    return proofResponse({ error: 'Not found' }, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return proofResponse({ error: 'Body must be valid JSON' }, 400);
  }

  const checkpoint = assetPublishingProofCheckpointSchema.safeParse(body);
  if (!checkpoint.success) {
    return proofResponse(
      {
        error: 'Invalid proof checkpoint',
        issues: checkpoint.error.issues.slice(0, MAX_ISSUES).map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message.slice(0, MAX_ISSUE_MESSAGE_LENGTH),
        })),
      },
      400
    );
  }

  const now = options.now ?? (() => Date.now());
  return proofResponse({
    ok: true,
    serverTime: now(),
    runId: checkpoint.data.runId,
    phase: checkpoint.data.phase,
    outcome: checkpoint.data.outcome,
  });
}

export async function handleAssetPublishingProofEligibility(
  request: Request,
  options: {
    expectedSecret: string | undefined;
    eligibility: 'empty' | 'eligible';
  }
): Promise<Response> {
  if (!(await matchesProofSecret(request, options.expectedSecret))) {
    return proofResponse({ error: 'Not found' }, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return proofResponse({ error: 'Body must be valid JSON' }, 400);
  }

  const wakeUp = proofWakeUpSchema.safeParse(body);
  if (!wakeUp.success) {
    return proofResponse({ error: 'Invalid proof eligibility request' }, 400);
  }

  return proofResponse({
    ok: true,
    eligibility: options.eligibility,
    schemaVersion: wakeUp.data.schemaVersion,
    scheduledCutoff: wakeUp.data.scheduledCutoff,
    triggerId: wakeUp.data.triggerId,
  });
}
