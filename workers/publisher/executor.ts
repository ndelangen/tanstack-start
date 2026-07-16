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
import { type AssetBucket, conditionallyPutFactionSheet } from './r2';

type BrowserSession = Pick<PublisherBrowserSession, 'capture' | 'close'>;

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
};

function errorMessage(error: unknown): string {
  return publisherErrorMessage(error);
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

async function closeWithin(
  browser: BrowserSession,
  deadlineAt: number,
  now: () => number
): Promise<boolean> {
  try {
    await withinDeadline(() => browser.close(), deadlineAt, now, 'Browser cleanup');
    return true;
  } catch {
    return false;
  }
}

async function openWithin(
  operation: () => Promise<BrowserSession>,
  launchDeadlineAt: number,
  cleanupDeadlineAt: number,
  cleanupGraceMs: number,
  now: () => number
): Promise<BrowserSession> {
  if (remaining(launchDeadlineAt, now) <= 0) {
    throw new Error('Browser launch exhausted the executor lifecycle deadline');
  }
  const openPromise = operation();
  try {
    return await withinDeadline(() => openPromise, launchDeadlineAt, now, 'Browser launch');
  } catch (error) {
    const lateCleanup = openPromise.then(
      async (browser) => await closeWithin(browser, cleanupDeadlineAt, now),
      () => false
    );
    try {
      await withinDeadline(
        () => lateCleanup,
        Math.min(cleanupDeadlineAt, now() + cleanupGraceMs),
        now,
        'Late browser cleanup'
      );
    } catch {
      // The reservation remains charged and fenced if launch never returns a controllable session.
    }
    throw error;
  }
}

async function bestEffort(operation: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error(
      serializePublisherLogEvent({
        event: 'asset_publisher_checkpoint_error',
        label,
        error: errorMessage(error),
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
  startedAt: number
): Promise<OwnedBatchReport> {
  const executorDeadlineAt = Math.min(
    startedAt + config.softDeadlineMs,
    acquisition.leaseExpiresAt
  );
  const ownedOutcomeDeadlineAt = executorDeadlineAt;
  const settlementDeadlineAt = Math.min(
    executorDeadlineAt + POST_LIFECYCLE_SETTLEMENT_WINDOW_MS,
    startedAt + QUEUE_WALL_LIMIT_MS - QUEUE_ACK_MARGIN_MS
  );
  if (config.browserCleanupGraceMs + SETTLEMENT_MARGIN_MS >= acquisition.browserReservationMs) {
    return {
      status: 'systemic_stop',
      browserOpened: false,
      browserClosed: false,
      browserSettled: false,
      uploaded: false,
      completed: false,
      error: 'Browser cleanup and settlement margins do not fit the exact reservation',
    };
  }

  let browser: BrowserSession | undefined;
  let launchAttempted = false;
  let browserOpened = false;
  let browserClosed = false;
  let browserSettled = false;
  let browserOpenedAt = 0;
  let browserDeadlineAt = 0;
  let ownedCheckpointDeadlineAt = executorDeadlineAt;
  let claim: ClaimedTarget | undefined;
  let uploaded = false;
  let completed = false;
  let uncertainClaim = false;
  let releaseUnclaimedBatch = false;
  let status: OwnedBatchReport['status'] = 'systemic_stop';
  let outcomeError: unknown;

  const closeAndSettle = async (): Promise<void> => {
    if (!browser || !browserOpened) return;
    if (!browserClosed) {
      const closeDeadlineAt = Math.min(
        browserDeadlineAt - SETTLEMENT_MARGIN_MS,
        dependencies.now() + config.browserCleanupGraceMs
      );
      browserClosed = await closeWithin(browser, closeDeadlineAt, dependencies.now);
    }
    if (!browserClosed || browserSettled) return;
    const measuredBrowserMs = Math.max(0, dependencies.now() - startedAt);
    if (dependencies.now() >= settlementDeadlineAt) {
      status = 'systemic_stop';
      outcomeError ??= new Error(
        'Browser usage could not be settled inside the post-lifecycle control-plane window'
      );
      return;
    }
    try {
      browserSettled =
        (await dependencies.client.settleBrowser(
          acquisition.batchToken,
          measuredBrowserMs,
          settlementDeadlineAt
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
    dependencies.fault?.('after_lease');
    const available = await withinDeadline(
      dependencies.browserAvailable,
      executorDeadlineAt,
      dependencies.now,
      'Browser availability check'
    );
    if (!available) {
      await dependencies.client.releaseBatch(
        acquisition.batchToken,
        'no_browser',
        executorDeadlineAt
      );
      status = 'systemic_stop';
      outcomeError = new Error('Browser Run acquisition is unavailable');
      return;
    }

    browserOpenedAt = dependencies.now();
    browserDeadlineAt = Math.min(
      browserOpenedAt + acquisition.browserReservationMs,
      executorDeadlineAt
    );
    const closeDeadlineAt = browserDeadlineAt - SETTLEMENT_MARGIN_MS;
    const browserOperationDeadlineAt = closeDeadlineAt - config.browserCleanupGraceMs;
    ownedCheckpointDeadlineAt = browserOperationDeadlineAt;
    if (browserOperationDeadlineAt <= browserOpenedAt) {
      throw new Error('No Browser lifecycle budget remains after cleanup and settlement margins');
    }
    launchAttempted = true;
    browser = await openWithin(
      dependencies.openBrowser,
      Math.min(browserOperationDeadlineAt, browserOpenedAt + config.browserCaptureTimeoutMs),
      closeDeadlineAt,
      config.browserCleanupGraceMs,
      dependencies.now
    );
    browserOpened = true;
    dependencies.fault?.('after_browser_open');

    let claimResult: ClaimResult;
    try {
      claimResult = await dependencies.client.claim(
        acquisition.batchToken,
        browserOperationDeadlineAt
      );
    } catch (firstClaimError) {
      try {
        claimResult = await dependencies.client.claim(
          acquisition.batchToken,
          browserOperationDeadlineAt
        );
      } catch (replayError) {
        uncertainClaim = true;
        throw new Error('Claim response was lost and exact replay could not prove its outcome', {
          cause: replayError,
        });
      }
      if (claimResult.status === 'claimed') {
        claim = claimResult;
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
    const capture = await withinDeadline(
      () =>
        (browser as BrowserSession).capture(
          (claim as ClaimedTarget).renderCapability,
          remaining(captureDeadlineAt, dependencies.now)
        ),
      captureDeadlineAt,
      dependencies.now,
      'Browser capture'
    );
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
    const revalidated = await dependencies.client.revalidate(
      exact(claim),
      browserOperationDeadlineAt
    );
    if (revalidated.status !== 'valid') {
      await dependencies.client.release(exact(claim), browserOperationDeadlineAt);
      status = 'stale';
      outcomeError = new Error(revalidated.status);
      return;
    }
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
    dependencies.fault?.('before_upload');
    const stored = await withinDeadline(
      () =>
        conditionallyPutFactionSheet(
          dependencies.bucket,
          config,
          claim as ClaimedTarget,
          capture.bytes,
          dependencies.now()
        ),
      browserOperationDeadlineAt,
      dependencies.now,
      'Stable R2 write'
    );
    uploaded = true;
    dependencies.fault?.('after_upload');
    dependencies.fault?.('before_completion');
    const completion = await dependencies.client.complete(
      exact(claim),
      stored.etag,
      capture.bytes.byteLength,
      browserOperationDeadlineAt
    );
    if (completion === 'stale') {
      status = 'stale';
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
    status = completed
      ? 'completed'
      : uncertainClaim || deadlineFailure || (launchAttempted && !browserOpened)
        ? 'systemic_stop'
        : 'failed';
    if (claim && !completed) {
      await bestEffort(
        () =>
          dependencies.client.fail(
            exact(claim as ClaimedTarget),
            errorMessage(error),
            ownedCheckpointDeadlineAt
          ),
        uncertainClaim ? 'recovered_claim' : 'owned_failure'
      );
    } else if (!launchAttempted) {
      await bestEffort(
        () =>
          dependencies.client.releaseBatch(
            acquisition.batchToken,
            'no_browser',
            ownedOutcomeDeadlineAt
          ),
        'no_browser_batch_release'
      );
    }
  } finally {
    await closeAndSettle();
  }

  if (claim && claim.rendererVersion !== config.supportedRendererVersion) {
    await bestEffort(
      () => dependencies.client.release(exact(claim as ClaimedTarget), ownedOutcomeDeadlineAt),
      'unsupported_renderer'
    );
  } else if (releaseUnclaimedBatch && browserSettled) {
    await bestEffort(
      () =>
        dependencies.client.releaseBatch(
          acquisition.batchToken,
          'after_settlement',
          ownedOutcomeDeadlineAt
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

  return {
    status,
    browserOpened,
    browserClosed,
    browserSettled,
    uploaded,
    completed,
    ...(outcomeError !== undefined ? { error: errorMessage(outcomeError) } : {}),
  };
}
