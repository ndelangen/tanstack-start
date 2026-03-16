import { createFileRoute, Link } from '@tanstack/react-router';

import { profilesListQueryOptions, useProfilesAll } from '@db/profiles';

export const Route = createFileRoute('/_app/profiles/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profilesListQueryOptions()),
  component: ProfilesPage,
});

function ProfilesPage() {
  const profiles = useProfilesAll();

  return (
    <>
      {profiles.data && profiles.data.length > 0 ? (
        <ul>
          {profiles.data.map((profile) => {
            const initials =
              profile.username
                ?.slice(0, 2)
                .toUpperCase()
                .replace(/[^A-Z]/g, '') || '?';
            return (
              <li key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/profiles/$id" params={{ id: profile.id }}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username ?? 'Avatar'}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                      }}
                    >
                      {initials}
                    </span>
                  )}
                </Link>
                <Link to="/profiles/$id" params={{ id: profile.id }}>
                  {profile.username ?? 'Unknown'}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No profiles yet.</p>
      )}
    </>
  );
}
