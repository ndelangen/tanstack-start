import { Link } from '@tanstack/react-router';

import type { ProfileEntry } from '@db/profile';

const ProfileLink = (profile: Pick<ProfileEntry, 'slug' | 'username' | 'avatar_url'>) => {
  return (
    <Link to="/profiles/$slug" params={{ slug: profile.slug }}>
      {profile.username}
    </Link>
  );
};
