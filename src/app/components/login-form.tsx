import { LogIn } from 'lucide-react';
import { useState } from 'react';

import { auth } from '@db/core';
import { FormActions, FormButton } from '@app/components/form';

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
        {error && <p role="alert">{error}</p>}
        <FormActions>
          <FormButton type="submit" disabled={isLoading}>
            <LogIn size={16} aria-hidden />
            <span>{isLoading ? 'Logging in...' : 'Continue with Discord'}</span>
          </FormButton>
        </FormActions>
      </form>
    </div>
  );
}
