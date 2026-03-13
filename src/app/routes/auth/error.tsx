import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/error')({
  component: AuthError,
  validateSearch: (params) => {
    if (params.error && typeof params.error === 'string') {
      return { error: params.error };
    }
    return null;
  },
});

function AuthError() {
  const params = Route.useSearch();

  return (
    <div>
      <div>
        <h2>Sorry, something went wrong.</h2>
        {params?.error ? (
          <p>Code error: {params.error}</p>
        ) : (
          <p>An unspecified error occurred.</p>
        )}
      </div>
    </div>
  );
}
