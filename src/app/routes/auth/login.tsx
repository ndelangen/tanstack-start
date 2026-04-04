import { createFileRoute, Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { LoginForm } from '@app/components/auth/LoginForm';

import styles from './LoginScreen.module.css';

export const Route = createFileRoute('/auth/login')({
  component: Login,
});

function Login() {
  const profile = useCurrentProfile();

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        {profile.data ? (
          <div className={styles.loggedIn}>
            <h1 className={styles.loggedInTitle}>You're signed in</h1>
            <p className={styles.loggedInName}>{profile.data.username ?? 'Player'}</p>
            <Link to="/" className={styles.homeLink}>
              Go to home
            </Link>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
