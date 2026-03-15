import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Page } from '@app/components/page/Page';

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
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/web/head.jpg';
  }, []);

  return (
    <Page>
      <div className={`${styles.header} ${imageLoaded ? styles.loaded : ''} ${styles.tiny}`}>
        <nav className={styles.nav}></nav>
      </div>
      <div className={`${styles.header} ${imageLoaded ? styles.loaded : ''}`}>
        <nav className={styles.nav}></nav>
      </div>
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
    </Page>
  );
}
