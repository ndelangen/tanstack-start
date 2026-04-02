import { createFileRoute, Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';

import { useCurrentProfile } from '@db/profiles';
import { FormActions } from '@app/components/form/FormActions';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import {
  useMigrationRunSnapshots,
  useMigrationStatuses,
  useSyncMigrationRuns,
} from '@app/migrations/db';

export const Route = createFileRoute('/_app/admin/migrations')({
  component: AdminMigrationsPage,
  staticData: {
    PageHead: () => <h1>Migration activity</h1>,
  },
});

function formatDate(timestamp?: number) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

function AdminMigrationsPage() {
  const profile = useCurrentProfile();
  const statuses = useMigrationStatuses();
  const snapshots = useMigrationRunSnapshots();
  const syncRuns = useSyncMigrationRuns();

  if (!profile.data?.id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to view migration activity.
        </p>
      </Card>
    );
  }

  return (
    <Stack gap={3}>
      <Card>
        <Stack gap={2}>
          <h2>Live migration status</h2>
          <FormActions>
            <FormTooltip content="Sync status snapshot to migration_runs table">
              <UIButton
                type="button"
                iconOnly
                aria-label="Sync migration status"
                disabled={syncRuns.isPending}
                onClick={() => syncRuns.mutate({})}
              >
                <RefreshCw size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </FormActions>
          <table>
            <thead>
              <tr>
                <th align="left">Migration</th>
                <th align="left">State</th>
                <th align="left">Done</th>
                <th align="left">Processed</th>
                <th align="left">Started</th>
                <th align="left">Ended</th>
                <th align="left">Error</th>
              </tr>
            </thead>
            <tbody>
              {(statuses.data ?? []).map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.state}</td>
                  <td>{row.isDone ? 'yes' : 'no'}</td>
                  <td>{row.processed}</td>
                  <td>{formatDate(row.latestStart)}</td>
                  <td>{formatDate(row.latestEnd)}</td>
                  <td>{row.error ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {statuses.isPending && <p>Loading live statuses...</p>}
        </Stack>
      </Card>

      <Card>
        <Stack gap={2}>
          <h2>Recorded snapshots</h2>
          <table>
            <thead>
              <tr>
                <th align="left">Migration ID</th>
                <th align="left">State</th>
                <th align="left">Done</th>
                <th align="left">Processed</th>
                <th align="left">Updated</th>
                <th align="left">Error</th>
              </tr>
            </thead>
            <tbody>
              {(snapshots.data ?? []).map((row) => (
                <tr key={row._id}>
                  <td>{row.migration_id}</td>
                  <td>{row.state}</td>
                  <td>{row.is_done ? 'yes' : 'no'}</td>
                  <td>{row.processed}</td>
                  <td>{row.updated_at}</td>
                  <td>{row.error ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshots.isPending && <p>Loading run snapshots...</p>}
        </Stack>
      </Card>
    </Stack>
  );
}
