import { createFileRoute } from '@tanstack/react-router';

import { AutoGrid } from '@app/components/generic/layout';
import { PageLayout } from '@app/components/shell';

import styles from './index.module.css';

export const Route = createFileRoute('/_app/')({
  component: IndexPage,
});

const PANELS = [
  { id: 'faction-1', title: 'Create a new faction' },
  { id: 'asset-1', title: 'Create a game asset' },
  { id: 'welcome-1', title: 'Welcome to the game' },
  { id: 'faction-2', title: 'Create a new faction' },
  { id: 'asset-2', title: 'Create a game asset' },
  { id: 'welcome-2', title: 'Welcome to the game' },
  { id: 'faction-3', title: 'Create a new faction' },
  { id: 'asset-3', title: 'Create a game asset' },
  { id: 'welcome-3', title: 'Welcome to the game' },
];

function IndexPage() {
  return (
    <PageLayout header={<h1 className={styles.navTitle}>Welcome to the game</h1>}>
      <AutoGrid minColumnWidth="240px" gap={5}>
        {PANELS.map(({ id, title }) => (
          <div className={styles.block} key={id}>
            <div className={styles.panel}>
              <p>{title}</p>
            </div>
            <p>See what others have created</p>
          </div>
        ))}
      </AutoGrid>
    </PageLayout>
  );
}
