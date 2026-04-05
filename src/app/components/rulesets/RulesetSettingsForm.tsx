import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import { useState } from 'react';

import { type RulesetEntry, useUpdateRuleset } from '@db/rulesets';
import formStyles from '@app/components/form/Form.module.css';
import { FormActions } from '@app/components/form/FormActions';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { TextField } from '@app/components/form/TextField';
import { Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';

const RULESET_SETTINGS_FORM_ID = 'ruleset-settings';

export function RulesetSettingsForm({ initial }: { initial: RulesetEntry }) {
  const navigate = useNavigate();
  const updateRuleset = useUpdateRuleset();

  const [name, setName] = useState(initial.name);
  const [coverUrl, setCoverUrl] = useState(initial.image_cover ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    const trimmedCover = coverUrl.trim();
    const prevSlug = initial.slug;
    try {
      const entry = await updateRuleset.mutateAsync({
        id: initial._id,
        input: { name: nextName },
        imageCover: trimmedCover === '' ? null : trimmedCover,
      });
      if (prevSlug !== entry.slug) {
        navigate({
          to: '/rulesets/$rulesetSlug/edit',
          params: { rulesetSlug: entry.slug },
          replace: true,
        });
      }
    } catch {
      /* mutation surfaces error via isError */
    }
  };

  const mutationError =
    updateRuleset.isError && updateRuleset.error instanceof Error
      ? updateRuleset.error.message
      : null;

  return (
    <Stack gap={2}>
      <Toolbar>
        <Toolbar.Left>
          <FormActions>
            <FormTooltip content={updateRuleset.isPending ? 'Saving…' : 'Save'}>
              <UIButton
                type="submit"
                form={RULESET_SETTINGS_FORM_ID}
                iconOnly
                aria-label="Save ruleset"
                disabled={updateRuleset.isPending}
              >
                <Save size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
            <FormTooltip content="View ruleset">
              <UIButton
                variant="secondary"
                to="/rulesets/$rulesetSlug"
                params={{ rulesetSlug: initial.slug }}
                aria-label="View ruleset"
              >
                <BookOpen size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
            <FormTooltip content="Back to rulesets">
              <UIButton variant="nav" to="/rulesets" aria-label="Back to rulesets">
                <ArrowLeft size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </FormActions>
        </Toolbar.Left>
      </Toolbar>

      <Card>
        <Stack as="form" gap={3} id={RULESET_SETTINGS_FORM_ID} onSubmit={handleSubmit}>
          <FormField label="Name" htmlFor="ruleset-settings-name">
            <TextField
              id="ruleset-settings-name"
              name="name"
              required
              minLength={1}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <p className={formStyles.hint}>
            Changing the name updates the URL slug (e.g. <code>…/rulesets/{initial.slug}</code> may
            change). Bookmarks and shared links to the old address will stop working.
          </p>

          <FormField label="Cover image URL" htmlFor="ruleset-settings-cover">
            <TextField
              id="ruleset-settings-cover"
              type="url"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://…"
              autoComplete="off"
            />
          </FormField>
          <p className={formStyles.hint}>
            Optional. Use a full <code>https://</code> URL. Leave empty to clear the cover.
          </p>

          {mutationError && (
            <p className={formStyles.error} role="alert">
              {mutationError}
            </p>
          )}

          <FormActions>
            <UIButton
              type="submit"
              disabled={updateRuleset.isPending || name.trim().length === 0}
            >
              {updateRuleset.isPending ? 'Saving…' : 'Save changes'}
            </UIButton>
          </FormActions>
        </Stack>
      </Card>
    </Stack>
  );
}
