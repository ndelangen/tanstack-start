import { createFileRoute, Link } from '@tanstack/react-router';

import { loadGroupDetailBySlug, useGroupDetailBySlug } from '@db/groups';
import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/generic/surfaces/Card';
import { GroupSettingsForm } from '@app/components/groups/GroupSettingsForm';

export const Route = createFileRoute('/_app/groups/$groupSlug/edit')({
  loader: async ({ params }) => {
    const groupDetail = await loadGroupDetailBySlug(params.groupSlug);
    return { groupDetail };
  },
  component: GroupEditPage,
  staticData: {
    PageHead: GroupEditPageHead,
  },
});

function GroupEditPageHead() {
  const { groupSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const groupData = useGroupDetailBySlug(groupSlug, { initialData: loaderData.groupDetail });

  return (
    <div>
      <h1>{groupData.group ? `Edit ${groupData.group.name}` : 'Edit group'}</h1>
    </div>
  );
}

function GroupEditPage() {
  const { groupSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const groupData = useGroupDetailBySlug(groupSlug, { initialData: loaderData.groupDetail });
  const profile = useCurrentProfile();

  if (groupData.isError || !groupData.group) {
    return (
      <Card>
        <p>Group not found.</p>
        <p>
          <Link to="/profiles">Back to profiles</Link>
        </p>
      </Card>
    );
  }

  const group = groupData.group;
  const viewerUserId = profile.data?.user_id;

  if (profile.isPending) {
    return null;
  }

  if (!viewerUserId) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to edit group settings.
        </p>
        <p>
          <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
            Back to group
          </Link>
        </p>
      </Card>
    );
  }

  if (viewerUserId !== group.created_by) {
    return (
      <Card>
        <p>Only the owner can edit the group settings.</p>
        <p>
          <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
            Back to group
          </Link>
        </p>
      </Card>
    );
  }

  return <GroupSettingsForm key={group.slug} initial={group} />;
}
