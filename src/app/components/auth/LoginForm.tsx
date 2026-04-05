import { useAuthActions } from '@convex-dev/auth/react';
import { LogIn } from 'lucide-react';
import { useState } from 'react';

import { Stack, Toolbar } from '@app/components/generic/layout';
import { UIButton } from '@app/components/generic/ui/UIButton';

export function LoginForm(props: React.ComponentPropsWithoutRef<'div'>) {
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
    <div {...props}>
      <Stack as="form" gap={3} onSubmit={(e) => handleSocialLogin(e, 'discord')}>
        <h2>Welcome!</h2>
        <p>Sign in to your account to continue</p>
        {error && <p role="alert">{error}</p>}
        <Toolbar>
          <Toolbar.Left>
            <UIButton
              type="button"
              disabled={loadingProvider !== null}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSocialLogin(e, 'discord')}
            >
              <LogIn size={16} aria-hidden />
              <span>{loadingProvider === 'discord' ? 'Logging in...' : 'Continue with Discord'}</span>
            </UIButton>
            <UIButton
              type="button"
              disabled={loadingProvider !== null}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSocialLogin(e, 'google')}
            >
              <LogIn size={16} aria-hidden />
              <span>{loadingProvider === 'google' ? 'Logging in...' : 'Continue with Google'}</span>
            </UIButton>
          </Toolbar.Left>
        </Toolbar>
      </Stack>
    </div>
  );
}
