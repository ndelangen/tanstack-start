import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Paper,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { Globe2 } from 'lucide-react';
import { useState } from 'react';

import { TopicIcon } from '@app/components/topics/TopicIcon';
import { AllianceCard } from '@game/assets/faction/alliance/Alliance';
import { LeaderToken } from '@game/assets/faction/leader/Leader';
import { Token } from '@game/assets/faction/token/Token';
import { TroopToken } from '@game/assets/faction/troop/Troop';
import { BackgroundRenderer } from '@game/assets/utils/BackgroundRenderer';

import styles from './FactionEditor.module.css';
import { FactionFormSectionAdvantages } from './FactionFormSectionAdvantages';
import { FactionFormSectionAlliance } from './FactionFormSectionAlliance';
import { FactionFormSectionBackground } from './FactionFormSectionBackground';
import { FactionFormSectionHero } from './FactionFormSectionHero';
import { FactionFormSectionIdentity } from './FactionFormSectionIdentity';
import { FactionFormSectionLeaders } from './FactionFormSectionLeaders';
import { FactionFormSectionPlanets } from './FactionFormSectionPlanets';
import { FactionFormSectionRules } from './FactionFormSectionRules';
import { FactionFormSectionTroops } from './FactionFormSectionTroops';
import {
  type FactionAuthoringChapterId,
  type FactionAuthoringWarning,
  factionAuthoringChapters,
} from './factionAuthoringContract';
import { assetOptionToPreviewSrc } from './factionFormAssetUtils';
import type { FactionFormApi } from './factionFormTypes';

export type { FactionFormApi } from './factionFormTypes';

const chapterIcons: Record<
  Exclude<FactionAuthoringChapterId, 'identity' | 'worlds'>,
  Parameters<typeof TopicIcon>[0]['topic']
> = {
  hero: 'hero',
  leaders: 'leaders',
  alliance: 'alliance',
  forces: 'troops',
  rules: 'rules',
  advantages: 'advantages',
};

function PreviewEmpty({ children }: { children: string }) {
  return (
    <Box className={styles.previewEmpty}>
      <Text c="dimmed" size="sm" ta="center">
        {children}
      </Text>
    </Box>
  );
}

function ArtifactProof({
  activeChapter,
  form,
}: {
  activeChapter: FactionAuthoringChapterId;
  form: FactionFormApi;
}) {
  const [identityProof, setIdentityProof] = useState<'background' | 'token'>('background');

  return (
    <form.Subscribe selector={(state) => state.values}>
      {(faction) => {
        const firstLeader = faction.leaders[0];
        const firstTroop = faction.troops[0];
        const firstWorld = faction.planet?.[0];
        const firstAdvantage = faction.rules.advantages[0];

        let title = 'Background composite';
        let usedOn = 'Faction sheet · faction token · leader tokens · troops · alliance card';
        let artifact: React.ReactNode = (
          <Box className={styles.squareProof}>
            {identityProof === 'background' ? (
              <BackgroundRenderer background={faction.background} />
            ) : (
              <Box className={styles.tokenProof}>
                <Token background={faction.background} logo={faction.logo} />
              </Box>
            )}
          </Box>
        );

        if (activeChapter === 'hero') {
          title = 'Faction leader token';
          usedOn = 'Faction shield';
          artifact = (
            <Box className={styles.leaderProof}>
              <LeaderToken
                background={faction.background}
                image={faction.hero.image}
                logo={faction.logo}
                name={faction.hero.name}
                strength={undefined}
              />
            </Box>
          );
        } else if (activeChapter === 'leaders') {
          title = 'Supporting leader token';
          usedOn = 'Leader tokens';
          artifact = firstLeader ? (
            <Box className={styles.leaderProof}>
              <LeaderToken
                background={faction.background}
                image={firstLeader.image}
                logo={faction.logo}
                name={firstLeader.name}
                strength={firstLeader.strength}
              />
            </Box>
          ) : (
            <PreviewEmpty>No supporting leaders yet.</PreviewEmpty>
          );
        } else if (activeChapter === 'alliance') {
          title = 'Alliance card';
          usedOn = 'Alliance card';
          artifact = firstTroop ? (
            <Box className={styles.cardProof}>
              <Box className={styles.cardCanvas}>
                <AllianceCard
                  background={faction.background}
                  decals={faction.decals}
                  logo={faction.logo}
                  text={faction.rules.alliance.text}
                  title={faction.name}
                  troop={firstTroop.image}
                />
              </Box>
            </Box>
          ) : (
            <PreviewEmpty>Add a troop type to complete the alliance-card proof.</PreviewEmpty>
          );
        } else if (activeChapter === 'worlds') {
          title = 'Selected world';
          usedOn = 'Future planet asset';
          artifact = firstWorld ? (
            <Box className={styles.planetProof}>
              <Image src={firstWorld.image} alt={firstWorld.name} fit="contain" />
            </Box>
          ) : (
            <PreviewEmpty>No faction worlds yet.</PreviewEmpty>
          );
        } else if (activeChapter === 'forces') {
          title = 'Selected troop token';
          usedOn = 'Troop supply · faction sheet';
          artifact = firstTroop ? (
            <Box className={styles.troopProof}>
              <TroopToken
                background={faction.background}
                image={firstTroop.image}
                star={firstTroop.star}
                striped={firstTroop.striped}
              />
            </Box>
          ) : (
            <PreviewEmpty>No troop types yet.</PreviewEmpty>
          );
        } else if (activeChapter === 'rules') {
          title = 'Faction-sheet excerpt';
          usedOn = 'Faction sheet';
          artifact = (
            <Paper className={styles.rulesProof} withBorder p="lg">
              <Text ff="serif" fw={800} tt="uppercase">
                At start
              </Text>
              <Text ff="serif" size="sm">
                Starting spice: {faction.rules.spiceCount} · {faction.rules.startText}
              </Text>
              <Text ff="serif" fw={800} tt="uppercase" mt="md">
                Revival
              </Text>
              <Text ff="serif" size="sm">
                {faction.rules.revivalText}
              </Text>
            </Paper>
          );
        } else if (activeChapter === 'advantages') {
          title = 'Advantage excerpt';
          usedOn = 'Faction sheet';
          artifact = firstAdvantage ? (
            <Paper className={styles.rulesProof} withBorder p="lg">
              <Text ff="serif" fw={800} tt="uppercase">
                {firstAdvantage.title || 'Faction advantage'}
              </Text>
              <Text ff="serif" size="sm">
                {firstAdvantage.text}
              </Text>
              {firstAdvantage.karama ? (
                <Text ff="serif" size="sm" mt="md">
                  <strong>Karama:</strong> {firstAdvantage.karama}
                </Text>
              ) : null}
            </Paper>
          ) : (
            <PreviewEmpty>No faction advantages yet.</PreviewEmpty>
          );
        }

        return (
          <Paper
            className={styles.artifactDesk}
            withBorder
            radius="lg"
            p="md"
            style={{ backgroundColor: 'var(--mantine-color-white)' }}
          >
            <Badge className={styles.liveBadge} color="teal" variant="light">
              Live
            </Badge>

            {activeChapter === 'identity' ? (
              <Box
                className={styles.sheetColorReference}
                style={{ backgroundColor: faction.themeColor }}
              >
                <Text size="xs" fw={800} tt="uppercase">
                  Sheet color
                </Text>
                <Text size="xs" ff="monospace">
                  {faction.themeColor}
                </Text>
              </Box>
            ) : null}

            {artifact}

            {activeChapter === 'identity' ? (
              <SegmentedControl
                className={styles.proofSwitch}
                fullWidth
                value={identityProof}
                onChange={(value) => setIdentityProof(value === 'token' ? 'token' : 'background')}
                data={[
                  { value: 'background', label: 'Background' },
                  { value: 'token', label: 'Faction token' },
                ]}
                aria-label="Choose identity artifact proof"
              />
            ) : null}

            <Box className={styles.artifactMeta}>
              <Text size="xs" fw={800} tt="uppercase" c="dune.8" lts="0.12em">
                Artifact workbench
              </Text>
              <Text fw={700}>{title}</Text>
              <Text c="dimmed" size="xs">
                Used on: {usedOn}.
              </Text>
            </Box>
          </Paper>
        );
      }}
    </form.Subscribe>
  );
}

function ChapterWarnings({
  warnings,
  onFocus,
}: {
  warnings: FactionAuthoringWarning[];
  onFocus: (warning: FactionAuthoringWarning) => void;
}) {
  if (warnings.length === 0) return null;
  return (
    <Alert color="yellow" variant="light" title="These fields may be incomplete">
      <Group gap="xs">
        {warnings.map((warning) => (
          <Button
            key={warning.path}
            type="button"
            variant="subtle"
            color="yellow"
            size="compact-xs"
            px={0}
            onClick={() => onFocus(warning)}
          >
            {warning.label}
          </Button>
        ))}
      </Group>
    </Alert>
  );
}

export function FactionFormFields({
  form,
  warnings,
  nameError,
}: {
  form: FactionFormApi;
  warnings: FactionAuthoringWarning[];
  nameError?: string;
}) {
  const [activeChapter, setActiveChapter] = useState<FactionAuthoringChapterId>('identity');
  const forChapter = (chapter: FactionAuthoringChapterId) =>
    warnings.filter((warning) => warning.chapter === chapter);

  const focusWarning = (warning: FactionAuthoringWarning) => {
    setActiveChapter(warning.chapter);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(warning.targetId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
    });
  };

  return (
    <Tabs
      className={styles.workbench}
      value={activeChapter}
      onChange={(value) => {
        if (value) setActiveChapter(value as FactionAuthoringChapterId);
      }}
      orientation="vertical"
      keepMounted={false}
    >
      <Tabs.List className={styles.chapterTabs} aria-label="Faction editor sections">
        {factionAuthoringChapters.map((chapter, index) => {
          const chapterWarnings = forChapter(chapter.id);
          return (
            <Tabs.Tab
              className={styles.chapterTab}
              key={chapter.id}
              value={chapter.id}
              leftSection={
                chapter.id === 'identity' ? (
                  <form.Subscribe selector={(state) => state.values.logo}>
                    {(logo) => (
                      <Image
                        src={assetOptionToPreviewSrc(logo)}
                        alt=""
                        w={22}
                        h={22}
                        fit="contain"
                      />
                    )}
                  </form.Subscribe>
                ) : chapter.id === 'worlds' ? (
                  <Globe2 size={21} aria-hidden />
                ) : (
                  <TopicIcon topic={chapterIcons[chapter.id]} size={21} />
                )
              }
              rightSection={
                chapterWarnings.length > 0 ? (
                  <Badge circle size="sm" color="yellow">
                    {chapterWarnings.length}
                  </Badge>
                ) : undefined
              }
            >
              <Text component="span" className={styles.chapterNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text component="span" fw={700}>
                {chapter.label}
              </Text>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>

      <Box className={styles.editorPlane}>
        {factionAuthoringChapters.map((chapter) => (
          <Tabs.Panel key={chapter.id} value={chapter.id} className={styles.editorPanel}>
            <Stack gap="lg">
              <ChapterWarnings warnings={forChapter(chapter.id)} onFocus={focusWarning} />
              {chapter.id === 'identity' ? (
                <>
                  <FactionFormSectionIdentity form={form} nameError={nameError} showIntro={false} />
                  <FactionFormSectionBackground form={form} />
                </>
              ) : null}
              {chapter.id === 'hero' ? (
                <FactionFormSectionHero form={form} showPreview={false} />
              ) : null}
              {chapter.id === 'leaders' ? (
                <FactionFormSectionLeaders form={form} showPreview={false} />
              ) : null}
              {chapter.id === 'alliance' ? (
                <FactionFormSectionAlliance form={form} showPreview={false} />
              ) : null}
              {chapter.id === 'worlds' ? <FactionFormSectionPlanets form={form} /> : null}
              {chapter.id === 'forces' ? (
                <FactionFormSectionTroops form={form} showPreview={false} />
              ) : null}
              {chapter.id === 'rules' ? <FactionFormSectionRules form={form} /> : null}
              {chapter.id === 'advantages' ? <FactionFormSectionAdvantages form={form} /> : null}
            </Stack>
          </Tabs.Panel>
        ))}
      </Box>

      <Box className={styles.artifactColumn} visibleFrom="md">
        <ArtifactProof activeChapter={activeChapter} form={form} />
      </Box>
    </Tabs>
  );
}
