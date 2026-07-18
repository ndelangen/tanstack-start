import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Users } from 'lucide-react';

import { loadGroupDetailBySlug, useGroupDetailBySlug } from '@db/groups';
import { useCurrentProfile } from '@db/profiles';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { ButtonGroup, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { GroupSettingsForm } from '@app/components/groups/GroupSettingsForm';
import { PageLayout } from '@app/components/shell';

export const Route = createFileRoute('/_app/groups/$groupSlug/edit')({
  loader: async ({ params }) => {
    const groupDetail = await loadGroupDetailBySlug(params.groupSlug);
    return { groupDetail };
  },
  component: GroupEditPage,
});

function GroupEditPage() {
  const { groupSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const groupData = useGroupDetailBySlug(groupSlug, { initialData: loaderData.groupDetail });
  const profile = useCurrentProfile();

  if (groupData.isError || !groupData.group) {
    return (
      <PageLayout header={<h1>Edit group</h1>}>
        <Card>
          <p>Group not found.</p>
          <p>
            <Link to="/profiles">Back to profiles</Link>
          </p>
        </Card>
      </PageLayout>
    );
  }

  const group = groupData.group;
  const viewerUserId = profile.data?.user_id;
  const header = <h1>{`Edit ${group.name}`}</h1>;
  const toolbar = (
    <Toolbar>
      <Toolbar.Left>
        <ButtonGroup>
          <FormTooltip content="Back to profiles">
            <UIButton variant="nav" to="/profiles" aria-label="Back to profiles">
              <ArrowLeft size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
          <FormTooltip content="View group">
            <UIButton
              variant="secondary"
              to="/groups/$groupSlug"
              params={{ groupSlug: group.slug }}
              aria-label="View group"
            >
              <Users size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
        </ButtonGroup>
      </Toolbar.Left>
    </Toolbar>
  );

  if (profile.isPending) {
    return (
      <PageLayout header={header} toolbar={toolbar}>
        Loading profile…
      </PageLayout>
    );
  }

  if (!viewerUserId) {
    return (
      <PageLayout header={header} toolbar={toolbar}>
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
      </PageLayout>
    );
  }

  if (viewerUserId !== group.created_by) {
    return (
      <PageLayout header={header} toolbar={toolbar}>
        <Card>
          <p>Only the owner can edit the group settings.</p>
          <p>
            <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
              Back to group
            </Link>
          </p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header} toolbar={toolbar}>
      <Card>
        <GroupSettingsForm key={group.slug} initial={group} />
      </Card>
    </PageLayout>
  );
}
