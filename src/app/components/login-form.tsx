import { useState } from 'react';

import { auth } from '@db/core';

export function LoginForm(props: React.ComponentPropsWithoutRef<'div'>) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await auth.signInWithOAuth({
        provider: 'discord',
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div {...props}>
      <form onSubmit={handleSocialLogin}>
        <h2>Welcome!</h2>
        <p>Sign in to your account to continue</p>
        <div>
          {error && <p>{error}</p>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Continue with Discord'}
          </button>
        </div>
      </form>
    </div>
  );
}
