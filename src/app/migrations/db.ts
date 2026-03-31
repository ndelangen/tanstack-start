import { toLiveQueryResult, useLiveMutation } from '@app/db/core/live';
import { useQuery } from 'convex/react';

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
  const liveData = useQuery(api.migrations.getStatus, { ids });
  return toLiveQueryResult<MigrationStatusRow[]>(liveData as MigrationStatusRow[] | undefined);
}

export function useMigrationRunSnapshots() {
  const liveData = useQuery(api.migrations.listRunSnapshots, {});
  return toLiveQueryResult<MigrationRunSnapshot[]>(liveData as MigrationRunSnapshot[] | undefined);
}

export function useSyncMigrationRuns() {
  return useLiveMutation<{ ids?: string[] }, { synced: number }>(api.migrations.syncMigrationRuns);
}
