import { publisherErrorMessage } from '../../src/app/capture/publisher-diagnostics';
import type { PublisherConfig } from './config';
import type { AcquireResult, ConvexPublisherClient } from './convex';
import { type PublisherWakeUp, parseWakeUp } from './dispatch';
import { executeOwnedBatch, type OwnedBatchDependencies, type OwnedBatchReport } from './executor';
import { PublisherHttpError } from './http';

export type PublisherQueueMessage = {
  id: string;
  attempts: number;
  body: unknown;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type QueueDependencies = {
  client: Pick<
    ConvexPublisherClient,
    | 'acquire'
    | 'claim'
    | 'settleBrowser'
    | 'releaseBatch'
    | 'revalidate'
    | 'complete'
    | 'fail'
    | 'release'
  >;
  owned: Omit<OwnedBatchDependencies, 'client'>;
  now: () => number;
  log: (event: Record<string, unknown>) => void;
};

export async function consumePublisherMessage(
  message: PublisherQueueMessage,
  config: PublisherConfig,
  dependencies: QueueDependencies
): Promise<{ action: 'ack' | 'retry'; reason: string; report?: OwnedBatchReport }> {
  let wakeUp: PublisherWakeUp;
  try {
    wakeUp = parseWakeUp(message.body);
  } catch (error) {
    message.ack();
    dependencies.log({
      event: 'asset_publisher_queue',
      messageId: message.id,
      action: 'ack',
      reason: 'invalid',
      error: publisherErrorMessage(error),
    });
    return { action: 'ack', reason: 'invalid' };
  }

  const startedAt = dependencies.now();
  const executorDeadlineAt = startedAt + config.softDeadlineMs;
  let acquisition: AcquireResult;
  try {
    acquisition = await dependencies.client.acquire(wakeUp.triggerId, executorDeadlineAt);
  } catch (error) {
    const retryable = error instanceof PublisherHttpError && error.transient;
    if (retryable && message.attempts < config.queueMaxPreOwnershipAttempts) {
      message.retry({ delaySeconds: config.queueRetryDelaySeconds });
      dependencies.log({
        event: 'asset_publisher_queue',
        messageId: message.id,
        triggerId: wakeUp.triggerId,
        action: 'retry',
        reason: 'transient_before_ownership',
      });
      return { action: 'retry', reason: 'transient_before_ownership' };
    }
    message.ack();
    dependencies.log({
      event: 'asset_publisher_queue',
      messageId: message.id,
      triggerId: wakeUp.triggerId,
      action: 'ack',
      reason: retryable ? 'pre_ownership_retries_exhausted' : 'permanent_before_ownership',
    });
    return {
      action: 'ack',
      reason: retryable ? 'pre_ownership_retries_exhausted' : 'permanent_before_ownership',
    };
  }

  if (acquisition.status !== 'acquired') {
    message.ack();
    dependencies.log({
      event: 'asset_publisher_queue',
      messageId: message.id,
      triggerId: wakeUp.triggerId,
      action: 'ack',
      reason: acquisition.status,
      acquisition,
    });
    return { action: 'ack', reason: acquisition.status };
  }

  let report: OwnedBatchReport;
  try {
    report = await executeOwnedBatch(
      { ...dependencies.owned, client: dependencies.client },
      config,
      acquisition,
      startedAt
    );
  } catch (error) {
    report = {
      status: 'systemic_stop',
      browserOpened: false,
      browserClosed: false,
      browserSettled: false,
      uploaded: false,
      completed: false,
      error: publisherErrorMessage(error),
    };
  }
  message.ack();
  dependencies.log({
    event: 'asset_publisher_queue',
    messageId: message.id,
    triggerId: wakeUp.triggerId,
    action: 'ack',
    reason: 'consumer_owned_outcome',
    report,
  });
  return { action: 'ack', reason: 'consumer_owned_outcome', report };
}
