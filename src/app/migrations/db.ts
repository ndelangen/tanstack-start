import { useQuery } from 'convex/react';

import { db } from '@db/core';
import { toLiveQueryResult, useLiveMutation } from '@app/db/core/live';

import { api } from '../../../convex/_generated/api';

export type MigrationStatusRow = {
  name: string;
  state: 'inProgress' | 'success' | 'failed' | 'canceled' | 'unknown';
  isDone: boolean;
  processed: number;
  latestStart: number;
  latestEnd?: number;
  error?: string;
};

export type MigrationRunSnapshot = {
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

export type AdminMigrationDashboardData = {
  statuses: MigrationStatusRow[];
  snapshots: MigrationRunSnapshot[];
};

export async function loadAdminMigrationDashboard(
  ids?: string[]
): Promise<AdminMigrationDashboardData> {
  return await db.query<AdminMigrationDashboardData>(api.migrations.adminDashboard, {
    ids,
  });
}

export function useAdminMigrationDashboard(options?: {
  initialData?: AdminMigrationDashboardData;
  ids?: string[];
}) {
  const args = options?.ids ? { ids: options.ids } : {};
  const liveData = useQuery(api.migrations.adminDashboard, args) as
    | AdminMigrationDashboardData
    | undefined;
  const result = toLiveQueryResult(liveData, true, () => options?.initialData);
  return {
    ...result,
    statuses: result.data?.statuses ?? [],
    snapshots: result.data?.snapshots ?? [],
  };
}

export function useSyncMigrationRuns() {
  return useLiveMutation<{ ids?: string[] }, { synced: number }>(api.migrations.syncMigrationRuns);
}
