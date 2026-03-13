import { createFileRoute } from '@tanstack/react-router';
import { Route as RouteIcon, Server, Shield, Sparkles, Waves, Zap } from 'lucide-react';

import styles from './index.module.css';

// import { db } from '@db/core';

export const Route = createFileRoute('/')({
  component: App,
  // loader: async () => {
  //   const { data: factions } = await db.from('factions').select();
  //   return { factions };
  // },
});

function App() {
  // const { factions } = Route.useLoaderData();
  // console.log({ factions });

  return (
    <div className={styles.container}>
      <div className={styles.horizontalPanels}>
        <div className={styles.block}>
          <div className={styles.panel}>
            <p>Create a new faction</p>
          </div>
          <p>See what others have created</p>
        </div>
        <div className={styles.block}>
          <div className={styles.panel}>
            <p>Create a game asset</p>
          </div>
          <p>See what others have created</p>
        </div>
        <div className={styles.block}>
          <div className={styles.panel}>
            <p>Welcome to the game</p>
          </div>
          <p>See what others have created</p>
        </div>
      </div>
    </div>
  );
}
