import { useAuthActions } from '@convex-dev/auth/react';
import { type ComponentPropsWithoutRef, useState } from 'react';
import { SiDiscord } from 'react-icons/si';

import { Stack } from '@app/components/generic/layout';

import { GoogleColoredMark } from './GoogleColoredMark';
import styles from './LoginForm.module.css';

export function LoginForm(props: ComponentPropsWithoutRef<'div'>) {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (e: React.SyntheticEvent, provider: 'discord' | 'google') => {
    e.preventDefault();
    setLoadingProvider(provider);
    setError(null);

    try {
      await signIn(provider, { redirectTo: '/' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoadingProvider(null);
    }
  };

  return (
    <div className={styles.root} {...props}>
      <Stack
        as="form"
        gap={3}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <h2 className={styles.title}>Welcome</h2>
        <p className={styles.lede}>Sign in with your preferred account to continue.</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.providers}>
          <button
            type="button"
            className={`${styles.providerButton} ${styles.discord}`}
            disabled={loadingProvider !== null}
            aria-label={
              loadingProvider === 'discord' ? 'Signing in with Discord…' : 'Continue with Discord'
            }
            onClick={(e) => void handleSocialLogin(e, 'discord')}
          >
            <SiDiscord size={26} aria-hidden />
          </button>
          <button
            type="button"
            className={`${styles.providerButton} ${styles.google}`}
            disabled={loadingProvider !== null}
            aria-label={
              loadingProvider === 'google' ? 'Signing in with Google…' : 'Continue with Google'
            }
            onClick={(e) => void handleSocialLogin(e, 'google')}
          >
            <GoogleColoredMark width={26} height={26} />
          </button>
        </div>
        <p className={styles.hint}>Discord and Google are the supported sign-in options.</p>
      </Stack>
    </div>
  );
}
