import { createFileRoute } from '@tanstack/react-router';

import styles from './index.module.css';

function IndexHead() {
  return <h1 className={styles.navTitle}>Welcome to the game</h1>;
}

export const Route = createFileRoute('/_app/')({
  component: IndexPage,
  staticData: {
    PageHead: IndexHead,
  },
});

function IndexPage() {
  return (
    <>
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
    </>
  );
}
