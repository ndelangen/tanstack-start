import { useLiveMutation, useLiveQuery } from '@app/db/core/live';

import { api } from '../../../convex/_generated/api';

type MigrationStatusRow = {
  name: string;
  state: 'inProgress' | 'success' | 'failed' | 'canceled' | 'unknown';
  isDone: boolean;
  processed: number;
  latestStart: number;
  latestEnd?: number;
  error?: string;
};

type MigrationRunSnapshot = {
  _id: string;
  migration_id: string;
  state: 'inProgress' | 'success' | 'failed' | 'canceled' | 'unknown';
  is_done: boolean;
  processed: number;
  latest_start: number;
  latest_end?: number;
  error?: string;
  updated_at: string;
};

export function useMigrationStatuses(ids?: string[]) {
  return useLiveQuery<MigrationStatusRow[], { ids?: string[] }>(api.migrations.getStatus, { ids });
}

export function useMigrationRunSnapshots() {
  return useLiveQuery<MigrationRunSnapshot[], Record<string, never>>(
    api.migrations.listRunSnapshots,
    {}
  );
}

export function useSyncMigrationRuns() {
  return useLiveMutation<{ ids?: string[] }, { synced: number }>(api.migrations.syncMigrationRuns);
}
