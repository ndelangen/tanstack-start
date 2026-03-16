import { createFileRoute, Link } from '@tanstack/react-router';

import { factionsByOwnerQueryOptions, useFactionsByOwner } from '@db/factions';
import { userGroupMembershipsQueryOptions, useUserGroupMemberships } from '@db/members';
import {
  profileDetailQueryOptions,
  useCurrentProfile,
  useProfile,
} from '@db/profiles';

export const Route = createFileRoute('/_app/profiles/$id')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(profileDetailQueryOptions(params.id));
    await context.queryClient.ensureQueryData(userGroupMembershipsQueryOptions(params.id));
    await context.queryClient.ensureQueryData(factionsByOwnerQueryOptions(params.id));
  },
  component: ProfileDetailPage,
  staticData: {
    PageHead: ProfilePageHead,
  },
});

function ProfilePageHead() {
  const { id } = Route.useParams();
  const profile = useProfile(id);

  return (
    <div>
      <h1>{profile.data?.username ?? 'Profile'}</h1>
      <p>
        <Link to="/profiles">Back to profiles</Link>
      </p>
    </div>
  );
}

function ProfileDetailPage() {
  const { id } = Route.useParams();
  const profile = useProfile(id);
  const currentProfile = useCurrentProfile();
  const memberships = useUserGroupMemberships(id);
  const factions = useFactionsByOwner(id);

  if (!profile.data) {
    return null;
  }

  const isSelf = currentProfile.data?.id === profile.data.id;
  const initials =
    profile.data.username?.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, '') || '?';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        {profile.data.avatar_url ? (
          <img
            src={profile.data.avatar_url}
            alt={profile.data.username ?? 'Avatar'}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {initials}
          </span>
        )}
        <div>
          <h2>{profile.data.username ?? 'Unknown'}</h2>
          {isSelf && <p style={{ margin: 0, fontWeight: 600 }}>This is you!</p>}
        </div>
      </div>

      <h3>Groups</h3>
      {memberships.data && memberships.data.length > 0 ? (
        <ul>
          {memberships.data.map((m) => (
            <li key={m.group_id}>
              <span>{m.groups?.name ?? 'Unknown group'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Not a member of any groups.</p>
      )}

      <h3>Factions owned</h3>
      {factions.data && factions.data.length > 0 ? (
        <ul>
          {factions.data.map((faction) => (
            <li key={faction.id}>
              <Link to="/factions/$id" params={{ id: faction.id }}>
                {faction.data.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No factions owned.</p>
      )}

      <p>
        <Link to="/profiles">Back to profiles</Link>
      </p>
    </>
  );
}
