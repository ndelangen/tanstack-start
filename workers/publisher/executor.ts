import {
  publisherErrorMessage,
  serializePublisherLogEvent,
} from '../../src/app/capture/publisher-diagnostics';
import { assertCapturedPdfOutput, type PublisherBrowserSession } from './browser';
import type { PublisherConfig } from './config';
import type {
  AcquireResult,
  ClaimedTarget,
  ClaimResult,
  ConvexPublisherClient,
  ExactClaim,
} from './convex';
import {
  type AssetBucket,
  ConditionalWriteConflictError,
  conditionallyPutFactionSheet,
  StorageGuardError,
} from './r2';
import { rendererManifest } from './renderer-manifest.generated';
import {
  OwnedTelemetry,
  PUBLISHER_TELEMETRY_SCHEMA_VERSION,
  type PublisherBuildIdentity,
  type PublisherFailureClass,
  safeTelemetryCorrelationHash,
} from './telemetry';

type BrowserSession = Pick<PublisherBrowserSession, 'capture' | 'close'> & {
  sessionId?(): string;
};

const SETTLEMENT_MARGIN_MS = 5_000;
const POST_LIFECYCLE_SETTLEMENT_WINDOW_MS = 30_000;
const QUEUE_WALL_LIMIT_MS = 15 * 60 * 1_000;
const QUEUE_ACK_MARGIN_MS = 60_000;

export type FailurePoint =
  | 'after_lease'
  | 'after_browser_open'
  | 'after_claim'
  | 'after_render'
  | 'before_upload'
  | 'after_upload'
  | 'before_completion'
  | 'after_completion';

export type OwnedBatchDependencies = {
  client: Pick<
    ConvexPublisherClient,
    'claim' | 'settleBrowser' | 'releaseBatch' | 'revalidate' | 'complete' | 'fail' | 'release'
  >;
  bucket: AssetBucket;
  browserAvailable: () => Promise<boolean>;
  openBrowser: () => Promise<BrowserSession>;
  now: () => number;
  fault?: (point: FailurePoint) => void;
};

export type OwnedBatchReport = {
  status: 'completed' | 'empty' | 'stale' | 'failed' | 'systemic_stop';
  browserOpened: boolean;
  browserClosed: boolean;
  browserSettled: boolean;
  uploaded: boolean;
  completed: boolean;
  error?: string;
  telemetry: OwnedBatchTelemetry;
};

export type OwnedBatchTelemetryContext = {
  acquireDurationMs: number;
  identity: PublisherBuildIdentity;
  messageId: string;
  queueAttempt: number;
  queueName: string;
  triggerId: string;
};

export type OwnedBatchTelemetry = {
  schemaVersion: typeof PUBLISHER_TELEMETRY_SCHEMA_VERSION;
  identity?: PublisherBuildIdentity;
  queue: {
    messageId?: string;
    attempt?: number;
    name?: string;
    lane: 'foreground';
    triggerId?: string;
  };
  batchCorrelationHash: string | null;
  configuredMaxItems: 1;
  effectiveMaxItems: 1;
  phasesMs: ReturnType<OwnedTelemetry['snapshot']>['phasesMs'];
  workerObservedWallMs: number;
  platform: {
    cpuMs: null;
    wallMs: null;
    memoryBytes: null;
    subrequests: null;
    invocationOutcome: null;
    source: 'cloudflare_analytics_required';
  };
  logicalCalls: ReturnType<OwnedTelemetry['snapshot']>['logicalCalls'];
  counts: {
    claimed: number;
    completed: number;
    stale: number;
    failed: number;
    terminalError: number;
  };
  invocationFailureClass: PublisherFailureClass | null;
  browser: {
    sessionCorrelationHash: string | null;
    openToCloseMs: number | null;
    closeAttemptMs: number | null;
    outcome:
      | 'not_opened'
      | 'closed'
      | 'close_failed'
      | 'close_timeout'
      | 'late_opened_closed'
      | 'late_opened_close_failed'
      | 'late_opened_close_timeout'
      | 'late_launch_unresolved_fenced';
    providerCloseReason: null;
    providerOutcomeSource: 'browser_run_history_required';
  };
  quota: {
    reservedMs: number;
    measuredLifecycleMs: number | null;
    settled: boolean;
    dailyAccountedAfterReservationMs: number;
    denialReason: null;
  };
  minimumLeaseMarginMs: number | null;
  leaseMarginsMs: ReturnType<OwnedTelemetry['snapshot']>['leaseMarginsMs'];
  item: {
    claimCorrelationHash: string | null;
    rendererId: string;
    rendererMismatch: boolean;
    outcome: 'completed' | 'stale' | 'failed';
    failureClass: PublisherFailureClass | null;
    pdf: {
      bytes: number | null;
      pages: number | null;
      widthMm: number | null;
      heightMm: number | null;
    };
  } | null;
};

function errorMessage(error: unknown): string {
  return publisherErrorMessage(error);
}

function failureClass(error: unknown): PublisherFailureClass | null {
  if (error === undefined) return null;
  if (error instanceof ConditionalWriteConflictError) return 'conditional_conflict';
  if (error instanceof StorageGuardError) return 'storage_guard';
  const message = errorMessage(error);
  if (/deadline|timeout/i.test(message)) return 'timeout';
  if (/conflict/i.test(message)) return 'conflict';
  if (/quota|reservation/i.test(message)) return 'quota_or_reservation';
  if (/^empty$|no claim/i.test(message)) return 'no_claim';
  if (/stale/i.test(message)) return 'stale';
  if (/renderer/i.test(message)) return 'renderer';
  if (/unavailable/i.test(message)) return 'browser_unavailable';
  return 'operational_failure';
}

function failureDiagnostic(value: PublisherFailureClass | null): string | undefined {
  if (value === null) return undefined;
  return `asset publisher ${value.replaceAll('_', ' ')}`;
}

function hasStatus(
  status: OwnedBatchReport['status'],
  expected: OwnedBatchReport['status']
): boolean {
  return status === expected;
}

function exact(claim: ClaimedTarget): ExactClaim {
  return {
    targetId: claim.targetId,
    batchToken: claim.batchToken,
    claimToken: claim.claimToken,
    generation: claim.generation,
    rendererVersion: claim.rendererVersion,
  };
}

function remaining(deadlineAt: number, now: () => number): number {
  return Math.max(0, Math.ceil(deadlineAt - now()));
}

async function withinDeadline<T>(
  operation: () => Promise<T>,
  deadlineAt: number,
  now: () => number,
  label: string
): Promise<T> {
  const available = remaining(deadlineAt, now);
  if (available <= 0) throw new Error(`${label} exhausted the executor lifecycle deadline`);
  let handle: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`${label} exhausted the executor lifecycle deadline`)),
      available
    );
  });
  try {
    return await Promise.race([operation(), deadline]);
  } finally {
    if (handle !== undefined) clearTimeout(handle);
  }
}

type BrowserCloseObservation = {
  closed: boolean;
  durationMs: number;
  outcome: 'closed' | 'failed' | 'timeout';
};

async function closeWithObservation(
  browser: BrowserSession,
  deadlineAt: number,
  now: () => number
): Promise<BrowserCloseObservation> {
  const startedAt = now();
  try {
    await withinDeadline(() => browser.close(), deadlineAt, now, 'Browser cleanup');
    return { closed: true, durationMs: Math.max(0, now() - startedAt), outcome: 'closed' };
  } catch (error) {
    return {
      closed: false,
      durationMs: Math.max(0, now() - startedAt),
      outcome: /deadline/i.test(errorMessage(error)) ? 'timeout' : 'failed',
    };
  }
}

type LateBrowserCleanupObservation = {
  openedAt: number;
  closedAt: number | null;
  sessionId: string | null;
  close: BrowserCloseObservation;
};

async function openWithin(
  operation: () => Promise<BrowserSession>,
  launchDeadlineAt: number,
  cleanupDeadlineAt: number,
  cleanupGraceMs: number,
  now: () => number,
  observeLaunchAttempt: (durationMs: number) => void,
  observeLateWait: (durationMs: number) => void,
  observeLateCleanup: (observation: LateBrowserCleanupObservation) => void,
  observeUnresolvedFence: () => void
): Promise<BrowserSession> {
  if (remaining(launchDeadlineAt, now) <= 0) {
    throw new Error('Browser launch exhausted the executor lifecycle deadline');
  }
  const openPromise = operation();
  const launchStartedAt = now();
  const launchOutcome = withinDeadline(
    () => openPromise,
    launchDeadlineAt,
    now,
    'Browser launch'
  ).then(
    (browser) => ({ status: 'opened' as const, browser }),
    (error: unknown) => ({ status: 'failed' as const, error })
  );
  let lateWaitStartedAt: number | null = null;
  let lateWaitRecorded = false;
  const recordLateWait = (): void => {
    if (lateWaitStartedAt === null || lateWaitRecorded) return;
    lateWaitRecorded = true;
    observeLateWait(Math.max(0, now() - lateWaitStartedAt));
  };
  const lateCleanup = openPromise.then(
    async (lateBrowser) => {
      const launch = await launchOutcome;
      if (launch.status === 'opened') return;
      const openedAt = now();
      recordLateWait();
      let sessionId: string | null = null;
      try {
        sessionId = lateBrowser.sessionId?.() ?? null;
      } catch {
        sessionId = null;
      }
      const closeStartedAt = now();
      const closeDeadlineAt =
        closeStartedAt < cleanupDeadlineAt
          ? Math.max(closeStartedAt + 1, cleanupDeadlineAt - 1)
          : closeStartedAt + cleanupGraceMs;
      const close = await closeWithObservation(lateBrowser, closeDeadlineAt, now);
      observeLateCleanup({
        openedAt,
        closedAt: close.closed ? now() : null,
        sessionId,
        close,
      });
    },
    async () => {
      await launchOutcome;
      recordLateWait();
    }
  );
  const launch = await launchOutcome;
  observeLaunchAttempt(Math.max(0, now() - launchStartedAt));
  if (launch.status === 'opened') return launch.browser;

  lateWaitStartedAt = now();
  try {
    await withinDeadline(() => lateCleanup, cleanupDeadlineAt, now, 'Late browser cleanup');
  } catch {
    recordLateWait();
    observeUnresolvedFence();
  }
  throw launch.error;
}

async function bestEffort(operation: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error(
      serializePublisherLogEvent({
        event: 'asset_publisher_checkpoint_error',
        label,
        failureClass: failureClass(error),
      })
    );
  }
}

function assertUploadTime(
  executorDeadlineAt: number,
  leaseExpiresAt: number,
  uploadMarginMs: number,
  now: number
): void {
  if (now >= executorDeadlineAt) {
    throw new Error('Executor reached its absolute lifecycle deadline before upload');
  }
  if (leaseExpiresAt - now < uploadMarginMs) {
    throw new Error('Exact claim lacks the required pre-upload lease margin');
  }
}

export async function executeOwnedBatch(
  dependencies: OwnedBatchDependencies,
  config: PublisherConfig,
  acquisition: Extract<AcquireResult, { status: 'acquired' }>,
  startedAt: number,
  telemetryContext?: OwnedBatchTelemetryContext
): Promise<OwnedBatchReport> {
  const telemetry = new OwnedTelemetry(dependencies.now);
  if (telemetryContext) telemetry.recordAcquire(telemetryContext.acquireDurationMs);
  const executorDeadlineAt = Math.min(
    startedAt + config.softDeadlineMs,
    acquisition.leaseExpiresAt
  );
  const ownedOutcomeDeadlineAt = executorDeadlineAt;
  const settlementDeadlineAt = Math.min(
    executorDeadlineAt + POST_LIFECYCLE_SETTLEMENT_WINDOW_MS,
    startedAt + QUEUE_WALL_LIMIT_MS - QUEUE_ACK_MARGIN_MS
  );
  const invalidReservation =
    config.browserCleanupGraceMs + SETTLEMENT_MARGIN_MS >= acquisition.browserReservationMs;

  let browser: BrowserSession | undefined;
  let launchAttempted = false;
  let browserOpened = false;
  let browserClosed = false;
  let browserSettled = false;
  let browserOpenedAt = 0;
  let browserClosedAt = 0;
  let browserDeadlineAt = 0;
  let browserSessionId: string | null = null;
  let browserSessionCorrelationHash: string | null = null;
  let browserCloseOutcome: BrowserCloseObservation['outcome'] | null = null;
  let lateBrowserCleanup: LateBrowserCleanupObservation | null = null;
  let lateBrowserLaunchUnresolved = false;
  let measuredLifecycleMs: number | null = null;
  let ownedCheckpointDeadlineAt = executorDeadlineAt;
  let claim: ClaimedTarget | undefined;
  let latestLeaseExpiresAt: number | null = null;
  let pdfBytes: number | null = null;
  let pdfPages: number | null = null;
  let pdfWidthMm: number | null = null;
  let pdfHeightMm: number | null = null;
  let uploaded = false;
  let completed = false;
  let staleItem = false;
  let uncertainClaim = false;
  let releaseUnclaimedBatch = false;
  let status: OwnedBatchReport['status'] = 'systemic_stop';
  let outcomeError: unknown;

  const closeAndSettle = async (): Promise<void> => {
    if (latestLeaseExpiresAt !== null) {
      telemetry.observeLease('cleanupStart', latestLeaseExpiresAt);
    }
    if (!browser || !browserOpened) return;
    if (!browserClosed) {
      const closeDeadlineAt = Math.min(
        browserDeadlineAt - SETTLEMENT_MARGIN_MS,
        dependencies.now() + config.browserCleanupGraceMs
      );
      const close = await telemetry.phase(
        'browserClose',
        async () =>
          await closeWithObservation(browser as BrowserSession, closeDeadlineAt, dependencies.now)
      );
      browserClosed = close.closed;
      browserCloseOutcome = close.outcome;
      if (browserClosed) browserClosedAt = dependencies.now();
    }
    if (!browserClosed || browserSettled) return;
    const measuredBrowserMs = Math.max(0, dependencies.now() - startedAt);
    measuredLifecycleMs = measuredBrowserMs;
    if (dependencies.now() >= settlementDeadlineAt) {
      status = 'systemic_stop';
      outcomeError ??= new Error(
        'Browser usage could not be settled inside the post-lifecycle control-plane window'
      );
      return;
    }
    try {
      browserSettled =
        (await telemetry.convex('settleBrowser', async () =>
          dependencies.client.settleBrowser(
            acquisition.batchToken,
            measuredBrowserMs,
            settlementDeadlineAt
          )
        )) === 'settled';
    } catch (error) {
      outcomeError ??= error;
    }
    if (measuredBrowserMs > acquisition.browserReservationMs) {
      status = 'systemic_stop';
      outcomeError = new Error(
        `Browser lifecycle overran its reservation: ${measuredBrowserMs} ms > ${acquisition.browserReservationMs} ms`
      );
    } else if (!browserSettled) {
      status = 'systemic_stop';
      outcomeError ??= new Error('Exact Browser reservation settlement was stale');
    }
  };

  const runLifecycle = async (): Promise<void> => {
    if (invalidReservation) {
      throw new Error('Browser cleanup and settlement margins do not fit the exact reservation');
    }
    dependencies.fault?.('after_lease');
    const available = await telemetry.phase('browserAvailability', async () =>
      withinDeadline(
        dependencies.browserAvailable,
        executorDeadlineAt,
        dependencies.now,
        'Browser availability check'
      )
    );
    if (!available) {
      await telemetry.convex('releaseBatch', async () =>
        dependencies.client.releaseBatch(acquisition.batchToken, 'no_browser', executorDeadlineAt)
      );
      status = 'systemic_stop';
      outcomeError = new Error('Browser Run acquisition is unavailable');
      return;
    }

    const browserLaunchStartedAt = dependencies.now();
    browserDeadlineAt = Math.min(
      browserLaunchStartedAt + acquisition.browserReservationMs,
      executorDeadlineAt
    );
    const closeDeadlineAt = browserDeadlineAt - SETTLEMENT_MARGIN_MS;
    const browserOperationDeadlineAt = closeDeadlineAt - config.browserCleanupGraceMs;
    ownedCheckpointDeadlineAt = browserOperationDeadlineAt;
    if (browserOperationDeadlineAt <= browserLaunchStartedAt) {
      throw new Error('No Browser lifecycle budget remains after cleanup and settlement margins');
    }
    launchAttempted = true;
    browser = await openWithin(
      dependencies.openBrowser,
      Math.min(browserOperationDeadlineAt, browserLaunchStartedAt + config.browserCaptureTimeoutMs),
      closeDeadlineAt,
      config.browserCleanupGraceMs,
      dependencies.now,
      (durationMs) => telemetry.recordPhase('browserLaunch', durationMs),
      (durationMs) => telemetry.recordPhase('lateBrowserWait', durationMs),
      (observation) => {
        lateBrowserCleanup = observation;
        telemetry.recordPhase('lateBrowserClose', observation.close.durationMs);
      },
      () => {
        lateBrowserLaunchUnresolved = true;
      }
    );
    browserOpened = true;
    browserOpenedAt = dependencies.now();
    if (browser.sessionId) {
      try {
        browserSessionId = browser.sessionId();
      } catch {
        browserSessionId = null;
      }
    }
    dependencies.fault?.('after_browser_open');

    let claimResult: ClaimResult;
    try {
      claimResult = await telemetry.convex('claim', async () =>
        dependencies.client.claim(acquisition.batchToken, browserOperationDeadlineAt)
      );
    } catch (firstClaimError) {
      try {
        claimResult = await telemetry.convex('claim', async () =>
          dependencies.client.claim(acquisition.batchToken, browserOperationDeadlineAt)
        );
      } catch (replayError) {
        uncertainClaim = true;
        throw new Error('Claim response was lost and exact replay could not prove its outcome', {
          cause: replayError,
        });
      }
      if (claimResult.status === 'claimed') {
        claim = claimResult;
        latestLeaseExpiresAt = claim.leaseExpiresAt;
        telemetry.observeLease('claim', latestLeaseExpiresAt);
        throw new Error('Claim response was lost; recovered the exact claim for failure cleanup', {
          cause: firstClaimError,
        });
      }
    }

    if (claimResult.status !== 'claimed') {
      releaseUnclaimedBatch = true;
      status = claimResult.status === 'empty' ? 'empty' : 'systemic_stop';
      outcomeError = new Error(claimResult.status);
      return;
    }
    claim = claimResult;
    latestLeaseExpiresAt = claim.leaseExpiresAt;
    telemetry.observeLease('claim', latestLeaseExpiresAt);
    dependencies.fault?.('after_claim');
    if (claim.rendererVersion !== config.supportedRendererVersion) {
      status = 'systemic_stop';
      outcomeError = new Error('Claim renderer is not supported by this deployment');
      return;
    }

    const captureDeadlineAt = Math.min(
      browserOperationDeadlineAt,
      dependencies.now() + config.browserCaptureTimeoutMs
    );
    const capture = await telemetry.phase('capture', async () =>
      withinDeadline(
        () =>
          (browser as BrowserSession).capture(
            (claim as ClaimedTarget).renderCapability,
            remaining(captureDeadlineAt, dependencies.now)
          ),
        captureDeadlineAt,
        dependencies.now,
        'Browser capture'
      )
    );
    pdfBytes = capture.bytes.byteLength;
    pdfPages = capture.pageCount;
    pdfWidthMm = capture.pageWidthMm;
    pdfHeightMm = capture.pageHeightMm;
    if (capture.bytes.byteLength === 0 || capture.bytes.byteLength > config.pdfMaxBytes) {
      throw new Error('Captured PDF is empty or exceeds the configured byte limit');
    }
    assertCapturedPdfOutput(capture);
    dependencies.fault?.('after_render');

    assertUploadTime(
      browserOperationDeadlineAt,
      claim.leaseExpiresAt,
      config.uploadMarginMs,
      dependencies.now()
    );
    const revalidated = await telemetry.convex('revalidate', async () =>
      dependencies.client.revalidate(exact(claim as ClaimedTarget), browserOperationDeadlineAt)
    );
    if (revalidated.status !== 'valid') {
      if ('leaseExpiresAt' in revalidated) {
        latestLeaseExpiresAt = Math.min(latestLeaseExpiresAt, revalidated.leaseExpiresAt);
        telemetry.observeLease('lastPreUpload', latestLeaseExpiresAt);
      }
      await telemetry.convex('release', async () =>
        dependencies.client.release(exact(claim as ClaimedTarget), browserOperationDeadlineAt)
      );
      status = 'stale';
      staleItem = true;
      outcomeError = new Error(revalidated.status);
      return;
    }
    latestLeaseExpiresAt = Math.min(latestLeaseExpiresAt, revalidated.leaseExpiresAt);
    if (
      revalidated.factionId !== claim.factionId ||
      revalidated.assetType !== claim.assetType ||
      revalidated.payloadHash !== claim.payloadHash
    ) {
      throw new Error('Revalidation identity does not match the exact claim');
    }
    assertUploadTime(
      browserOperationDeadlineAt,
      revalidated.leaseExpiresAt,
      config.uploadMarginMs,
      dependencies.now()
    );
    telemetry.observeLease('lastPreUpload', latestLeaseExpiresAt);
    dependencies.fault?.('before_upload');
    const stored = await withinDeadline(
      () =>
        conditionallyPutFactionSheet(
          {
            head: async (key) =>
              await telemetry.r2('head', async () => dependencies.bucket.head(key)),
            put: async (key, value, options) =>
              await telemetry.r2('put', async () => dependencies.bucket.put(key, value, options)),
          },
          claim as ClaimedTarget,
          capture.bytes
        ),
      browserOperationDeadlineAt,
      dependencies.now,
      'Stable R2 write'
    );
    uploaded = true;
    telemetry.observeLease('postR2', latestLeaseExpiresAt);
    dependencies.fault?.('after_upload');
    dependencies.fault?.('before_completion');
    let completion: 'completed' | 'stale';
    try {
      completion = await telemetry.convex('complete', async () =>
        dependencies.client.complete(
          exact(claim as ClaimedTarget),
          stored.etag,
          capture.bytes.byteLength,
          browserOperationDeadlineAt
        )
      );
    } finally {
      telemetry.observeLease('postCompletion', latestLeaseExpiresAt);
    }
    if (completion === 'stale') {
      status = 'stale';
      staleItem = true;
      return;
    }
    completed = true;
    dependencies.fault?.('after_completion');
    status = 'completed';
  };

  try {
    await runLifecycle();
  } catch (error) {
    outcomeError = error;
    const deadlineFailure = /deadline/i.test(errorMessage(error));
    status = invalidReservation
      ? 'systemic_stop'
      : completed
        ? 'completed'
        : uncertainClaim || deadlineFailure || (launchAttempted && !browserOpened)
          ? 'systemic_stop'
          : 'failed';
    if (claim && !completed) {
      await bestEffort(
        async () =>
          await telemetry.convex('fail', async () =>
            dependencies.client.fail(
              exact(claim as ClaimedTarget),
              failureDiagnostic(failureClass(error)) ?? 'asset publisher operational failure',
              ownedCheckpointDeadlineAt
            )
          ),
        uncertainClaim ? 'recovered_claim' : 'owned_failure'
      );
    } else if (!launchAttempted && !invalidReservation) {
      await bestEffort(
        async () =>
          await telemetry.convex('releaseBatch', async () =>
            dependencies.client.releaseBatch(
              acquisition.batchToken,
              'no_browser',
              ownedOutcomeDeadlineAt
            )
          ),
        'no_browser_batch_release'
      );
    }
  } finally {
    await closeAndSettle();
  }

  if (claim && claim.rendererVersion !== config.supportedRendererVersion) {
    await bestEffort(
      async () =>
        await telemetry.convex('release', async () =>
          dependencies.client.release(exact(claim as ClaimedTarget), ownedOutcomeDeadlineAt)
        ),
      'unsupported_renderer'
    );
  } else if (releaseUnclaimedBatch && browserSettled) {
    await bestEffort(
      async () =>
        await telemetry.convex('releaseBatch', async () =>
          dependencies.client.releaseBatch(
            acquisition.batchToken,
            'after_settlement',
            ownedOutcomeDeadlineAt
          )
        ),
      'unclaimed_batch_release'
    );
  } else if (uncertainClaim) {
    // The Convex release mutation also rejects while any target or snapshot owns this batch.
    // Retaining the singleton fence is the safe outcome when exact claim replay cannot be proven.
  }

  if (browserOpened && !browserClosed) {
    status = 'systemic_stop';
    outcomeError ??= new Error('Browser cleanup did not complete within the lifecycle deadline');
  }

  const telemetrySnapshot = telemetry.snapshot();
  const observedAt = dependencies.now();
  const observedLateCleanup = lateBrowserCleanup as LateBrowserCleanupObservation | null;
  const observedBrowserOpened = browserOpened || observedLateCleanup !== null;
  const observedBrowserClosed = browserClosed || observedLateCleanup?.close.closed === true;
  const observedSessionId = browserSessionId ?? observedLateCleanup?.sessionId ?? null;
  const [batchCorrelationHash, claimCorrelationHash, sessionCorrelationHash] = await Promise.all([
    safeTelemetryCorrelationHash('batch', acquisition.batchToken),
    claim ? safeTelemetryCorrelationHash('claim', claim.claimToken) : Promise.resolve(null),
    observedSessionId
      ? safeTelemetryCorrelationHash('browser_session', observedSessionId)
      : Promise.resolve(null),
  ]);
  browserSessionCorrelationHash = sessionCorrelationHash;
  const invocationFailureClass =
    browserOpened && !browserClosed && browserCloseOutcome === 'failed'
      ? 'cleanup_failure'
      : failureClass(outcomeError);
  const lateBrowserOutcome = observedLateCleanup
    ? observedLateCleanup.close.outcome === 'closed'
      ? 'late_opened_closed'
      : observedLateCleanup.close.outcome === 'timeout'
        ? 'late_opened_close_timeout'
        : 'late_opened_close_failed'
    : null;
  const telemetryReport: OwnedBatchTelemetry = {
    schemaVersion: PUBLISHER_TELEMETRY_SCHEMA_VERSION,
    ...(telemetryContext ? { identity: telemetryContext.identity } : {}),
    queue: {
      ...(telemetryContext
        ? {
            messageId: telemetryContext.messageId,
            attempt: telemetryContext.queueAttempt,
            name: telemetryContext.queueName,
            triggerId: telemetryContext.triggerId,
          }
        : {}),
      lane: 'foreground',
    },
    batchCorrelationHash,
    configuredMaxItems: config.maxItems,
    effectiveMaxItems: 1,
    phasesMs: telemetrySnapshot.phasesMs,
    workerObservedWallMs: Math.max(0, observedAt - startedAt),
    platform: {
      cpuMs: null,
      wallMs: null,
      memoryBytes: null,
      subrequests: null,
      invocationOutcome: null,
      source: 'cloudflare_analytics_required',
    },
    logicalCalls: telemetrySnapshot.logicalCalls,
    counts: {
      claimed: claim ? 1 : 0,
      completed: claim && completed ? 1 : 0,
      stale: claim && staleItem ? 1 : 0,
      failed:
        claim &&
        !completed &&
        !staleItem &&
        (hasStatus(status, 'failed') || hasStatus(status, 'systemic_stop'))
          ? 1
          : 0,
      terminalError: 0,
    },
    invocationFailureClass,
    browser: {
      sessionCorrelationHash: browserSessionCorrelationHash,
      openToCloseMs: observedLateCleanup?.closedAt
        ? Math.max(0, observedLateCleanup.closedAt - observedLateCleanup.openedAt)
        : browserOpened && browserClosed
          ? Math.max(0, browserClosedAt - browserOpenedAt)
          : null,
      closeAttemptMs:
        observedLateCleanup?.close.durationMs ?? telemetrySnapshot.phasesMs.browserClose ?? null,
      outcome:
        lateBrowserOutcome ??
        (lateBrowserLaunchUnresolved
          ? 'late_launch_unresolved_fenced'
          : !browserOpened
            ? 'not_opened'
            : browserCloseOutcome === 'timeout'
              ? 'close_timeout'
              : browserClosed
                ? 'closed'
                : 'close_failed'),
      providerCloseReason: null,
      providerOutcomeSource: 'browser_run_history_required',
    },
    quota: {
      reservedMs: acquisition.browserReservationMs,
      measuredLifecycleMs:
        measuredLifecycleMs ??
        (observedLateCleanup?.closedAt
          ? Math.max(0, observedLateCleanup.closedAt - startedAt)
          : null),
      settled: browserSettled,
      dailyAccountedAfterReservationMs: acquisition.dailyBrowserMs,
      denialReason: null,
    },
    minimumLeaseMarginMs: telemetrySnapshot.minimumLeaseMarginMs,
    leaseMarginsMs: telemetrySnapshot.leaseMarginsMs,
    item: claim
      ? {
          claimCorrelationHash,
          rendererId: rendererManifest.rendererId,
          rendererMismatch: claim.rendererVersion !== config.supportedRendererVersion,
          outcome: completed ? 'completed' : staleItem ? 'stale' : 'failed',
          failureClass: invocationFailureClass,
          pdf: {
            bytes: pdfBytes,
            pages: pdfPages,
            widthMm: pdfWidthMm,
            heightMm: pdfHeightMm,
          },
        }
      : null,
  };

  return {
    status,
    browserOpened: observedBrowserOpened,
    browserClosed: observedBrowserClosed,
    browserSettled,
    uploaded,
    completed,
    ...(failureDiagnostic(invocationFailureClass)
      ? { error: failureDiagnostic(invocationFailureClass) }
      : {}),
    telemetry: telemetryReport,
  };
}
