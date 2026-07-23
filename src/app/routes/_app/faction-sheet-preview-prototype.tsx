// PROTOTYPE — throw this route away after the faction-sheet review interaction is chosen.
// Three variants of the faction-sheet review panel, switchable via ?variant=.
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ChevronDown, Eye, Link2, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PageLayout } from '@app/components/shell';

import styles from './faction-sheet-preview-prototype.module.css';

type Variant = 'A' | 'B' | 'C';

const variants: ReadonlyArray<{ key: Variant; name: string }> = [
  { key: 'A', name: 'Wide push' },
  { key: 'B', name: 'Folio rail' },
  { key: 'C', name: 'Page focus' },
];

export const Route = createFileRoute('/_app/faction-sheet-preview-prototype')({
  validateSearch: (search: Record<string, unknown>): { variant: Variant } => ({
    variant: search.variant === 'B' || search.variant === 'C' ? search.variant : 'A',
  }),
  component: FactionSheetPreviewPrototype,
});

function FactionSheetPreviewPrototype() {
  const { variant } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [previewMounted, setPreviewMounted] = useState(false);
  const mountFrame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (mountFrame.current) cancelAnimationFrame(mountFrame.current);
    },
    []
  );

  const openReview = () => {
    if (previewMounted) {
      setReviewOpen(true);
      return;
    }

    setPreviewMounted(true);
    mountFrame.current = requestAnimationFrame(() => {
      mountFrame.current = requestAnimationFrame(() => setReviewOpen(true));
    });
  };

  const closeReview = () => {
    setReviewOpen(false);
  };

  const selectVariant = (next: Variant) => {
    if (mountFrame.current) cancelAnimationFrame(mountFrame.current);
    setReviewOpen(false);
    void navigate({ search: { variant: next }, replace: true });
  };

  if (!import.meta.env.DEV) {
    return (
      <PageLayout header={<Title order={1}>Prototype unavailable</Title>} headerSize="compact">
        <Paper withBorder p="xl">
          This throwaway route is available only in development.
        </Paper>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      headerSize="compact"
      header={
        <Stack align="center" gap={4}>
          <Badge variant="light" color="orange">
            Throwaway prototype
          </Badge>
          <Title order={1}>Faction sheet review</Title>
          <Text c="dimmed">Compare how the sheet displaces the editing document.</Text>
        </Stack>
      }
      toolbar={
        <Paper withBorder p="sm" radius="md" className={styles.routeToolbar}>
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs">
              <Badge color="orange" variant="light">
                Unsaved changes
              </Badge>
              <Text size="sm" c="dimmed">
                Last published 22 July, 23:14
              </Text>
            </Group>
            <Group gap="xs">
              {reviewOpen ? (
                <Button variant="default" leftSection={<X size={16} />} onClick={closeReview}>
                  Return to editing
                </Button>
              ) : null}
              <Button leftSection={<Save size={16} />}>Save faction</Button>
            </Group>
          </Group>
        </Paper>
      }
    >
      <Stack gap="md">
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <div>
              <Text fw={700}>
                {variant} — {variants.find((item) => item.key === variant)?.name}
              </Text>
              <Text size="sm" c="dimmed">
                Open the preview, then click the remaining editor context to close it.
              </Text>
            </div>
            {!reviewOpen ? (
              <Button leftSection={<Eye size={16} />} onClick={openReview}>
                Review faction sheet
              </Button>
            ) : null}
          </Group>
        </Paper>

        {variant === 'A' ? (
          <WidePushVariant mounted={previewMounted} open={reviewOpen} onClose={closeReview} />
        ) : variant === 'B' ? (
          <FolioRailVariant mounted={previewMounted} open={reviewOpen} onClose={closeReview} />
        ) : (
          <PageFocusVariant mounted={previewMounted} open={reviewOpen} onClose={closeReview} />
        )}
      </Stack>

      <PrototypeSwitcher current={variant} onSelect={selectVariant} />
    </PageLayout>
  );
}

function WidePushVariant({
  mounted,
  open,
  onClose,
}: {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <section className={`${styles.stage} ${styles.widePush}`} data-open={open || undefined}>
      <EditorContext className={styles.editorDocument} open={open} onClose={onClose}>
        <EditorDocument compact={open} />
      </EditorContext>
      {mounted ? (
        <div
          className={styles.sheetPanel}
          data-sheet-panel
          aria-hidden={!open}
          inert={open ? undefined : true}
        >
          <ReviewHeading onClose={onClose} title="Full-width review" />
          <SheetProofDesk />
        </div>
      ) : null}
    </section>
  );
}

function FolioRailVariant({
  mounted,
  open,
  onClose,
}: {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <section className={`${styles.stage} ${styles.folioRail}`} data-open={open || undefined}>
      <EditorContext className={styles.folioEditor} open={open} onClose={onClose}>
        {open ? <ChapterRail /> : <EditorDocument />}
      </EditorContext>
      {mounted ? (
        <div
          className={styles.sheetPanel}
          data-sheet-panel
          aria-hidden={!open}
          inert={open ? undefined : true}
        >
          <ReviewHeading onClose={onClose} title="Open folio" />
          <div className={styles.sheetSpread}>
            <SheetPage page={1} />
            <SheetPage page={2} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PageFocusVariant({
  mounted,
  open,
  onClose,
}: {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState<1 | 2>(1);

  useEffect(() => {
    if (!open) setPage(1);
  }, [open]);

  return (
    <section className={`${styles.stage} ${styles.pageFocus}`} data-open={open || undefined}>
      <EditorContext className={styles.editorDocument} open={open} onClose={onClose}>
        <EditorDocument compact={open} />
      </EditorContext>
      {mounted ? (
        <div
          className={styles.sheetPanel}
          data-sheet-panel
          aria-hidden={!open}
          inert={open ? undefined : true}
        >
          <ReviewHeading onClose={onClose} title="One readable page" />
          <Group justify="center" gap="xs" mb="md">
            <Button
              variant={page === 1 ? 'filled' : 'default'}
              size="xs"
              onClick={() => setPage(1)}
            >
              Page 1
            </Button>
            <Button
              variant={page === 2 ? 'filled' : 'default'}
              size="xs"
              onClick={() => setPage(2)}
            >
              Page 2
            </Button>
          </Group>
          <div className={styles.focusedPage}>
            <SheetPage page={page} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SheetProofDesk() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showScrollCue, setShowScrollCue] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateScrollCue = () => {
      const hasOverflow = canvas.scrollHeight > canvas.clientHeight + 2;
      const isNearEnd = canvas.scrollTop + canvas.clientHeight >= canvas.scrollHeight - 24;
      setShowScrollCue(hasOverflow && !isNearEnd);
    };

    const frame = requestAnimationFrame(updateScrollCue);
    const observer = new ResizeObserver(updateScrollCue);
    observer.observe(canvas);
    if (canvas.firstElementChild) observer.observe(canvas.firstElementChild);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={styles.proofDesk}>
      <Group justify="space-between" gap="md" wrap="nowrap" className={styles.proofDeskHeader}>
        <div>
          <Text className={styles.proofDeskEyebrow}>Folio proof</Text>
          <Text fw={700}>Two-page faction sheet</Text>
        </div>
        <Text size="xs" ta="right">
          A4 portrait
          <br />
          210 × 297 mm
        </Text>
      </Group>
      <div className={styles.sheetCanvasShell}>
        <div
          ref={canvasRef}
          className={styles.sheetCanvas}
          onScroll={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            setShowScrollCue(
              canvas.scrollHeight > canvas.clientHeight + 2 &&
                canvas.scrollTop + canvas.clientHeight < canvas.scrollHeight - 24
            );
          }}
        >
          <div className={styles.reviewArtifacts}>
            <FactionShieldCompanion />
            <div className={styles.sheetSpread}>
              <SheetPage page={1} />
              <SheetPage page={2} />
            </div>
          </div>
        </div>
        {showScrollCue ? (
          <div className={styles.scrollCue} role="status">
            <Text size="xs" fw={700}>
              Scroll for page 2
            </Text>
            <ChevronDown size={16} aria-hidden />
          </div>
        ) : null}
      </div>
      <Group justify="space-between" gap="md" className={styles.proofDeskFooter}>
        <Text size="xs">Current unsaved draft</Text>
        <Text size="xs">Fit to review plane · original proportions</Text>
      </Group>
    </div>
  );
}

function FactionShieldCompanion() {
  return (
    <div
      className={styles.shieldCompanion}
      role="img"
      aria-label="Faction shield companion preview"
    >
      <div className={`${styles.shieldMedallion} ${styles.shieldMedallionLeft}`}>M</div>
      <div className={styles.shieldHero}>LC</div>
      <div className={`${styles.shieldMedallion} ${styles.shieldMedallionRight}`}>M</div>
      <Text className={styles.shieldName}>House Meridia</Text>
    </div>
  );
}

function EditorContext({
  className,
  open,
  onClose,
  children,
}: {
  className: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div aria-hidden={open || undefined}>{children}</div>
      {open ? (
        <button
          type="button"
          className={styles.editorCloseTarget}
          aria-label="Close sheet review and return to editing"
          onClick={onClose}
        />
      ) : null}
    </div>
  );
}

function ReviewHeading({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text className={styles.eyebrow}>Current unsaved draft</Text>
          <Title order={2}>{title}</Title>
          <Text size="sm" c="dimmed">
            Editing is paused while the sheet is open.
          </Text>
        </div>
        <ActionIcon variant="default" size="lg" aria-label="Close sheet review" onClick={onClose}>
          <X size={18} />
        </ActionIcon>
      </Group>
      <Alert
        variant="light"
        color="orange"
        icon={<Link2 size={18} />}
        title="Share the faction URL, not a screenshot"
        className={styles.shareAlert}
      >
        Save this draft first, then share its faction URL so others always reach the published
        version.
      </Alert>
    </Stack>
  );
}

function EditorDocument({ compact = false }: { compact?: boolean }) {
  return (
    <Stack gap="lg" className={compact ? styles.editorCompact : undefined}>
      <Chapter number="01" title="Identity & Appearance" active>
        <Group grow align="stretch">
          <FieldMock label="Faction name" value="House Meridia" />
          <FieldMock label="Logo asset" value="meridia-sun.svg" />
        </Group>
        <Paper withBorder p="md" radius="md" className={styles.pipelineMock}>
          <Text fw={700}>Pattern → Treatment → Colors → Composite</Text>
          <Group grow mt="sm">
            <Box className={styles.patternTile} />
            <Box className={styles.treatmentTile}>Definition 72%</Box>
            <Box className={styles.compositeTile} />
          </Group>
        </Paper>
      </Chapter>
      <Chapter number="02" title="Leaders">
        <Group grow>
          <FieldMock label="Faction leader" value="Lady Corinne" />
          <FieldMock label="Supporting leaders" value="5 ordered leaders" />
        </Group>
      </Chapter>
      <Chapter number="03" title="Alliance">
        <FieldMock label="Alliance ability" value="Share prescience with your ally…" />
      </Chapter>
      <Chapter number="04" title="Forces & Worlds">
        <Group grow>
          <FieldMock label="Troop types" value="2 types" />
          <FieldMock label="Planets" value="Meridian Prime" />
        </Group>
      </Chapter>
      <Chapter number="05" title="Rules & Advantages">
        <FieldMock label="Starting spice" value="10" />
      </Chapter>
      <Paper withBorder p="lg" radius="md" className={styles.reviewPrompt}>
        <Title order={3}>Ready to review?</Title>
        <Text size="sm" c="dimmed">
          Inspect the complete faction sheet without leaving your draft.
        </Text>
      </Paper>
    </Stack>
  );
}

function Chapter({
  number,
  title,
  active = false,
  children,
}: {
  number: string;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Paper
      withBorder
      p="lg"
      radius="lg"
      className={styles.chapter}
      data-active={active || undefined}
    >
      <Text className={styles.eyebrow}>Chapter {number}</Text>
      <Title order={2} mb="md">
        {title}
      </Title>
      <Stack gap="md">{children}</Stack>
    </Paper>
  );
}

function FieldMock({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm" radius="md" className={styles.fieldMock}>
      <Text size="xs" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={600} truncate>
        {value}
      </Text>
    </Paper>
  );
}

function ChapterRail() {
  return (
    <Paper withBorder p="md" radius="lg" className={styles.chapterRail}>
      <Text className={styles.eyebrow}>Your draft</Text>
      <Title order={3} mb="md">
        House Meridia
      </Title>
      <Stack gap="xs">
        {[
          'Identity & Appearance',
          'Leaders',
          'Alliance',
          'Forces & Worlds',
          'Rules & Advantages',
        ].map((label, index) => (
          <Paper key={label} withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Chapter {String(index + 1).padStart(2, '0')}
            </Text>
            <Text size="sm" fw={700}>
              {label}
            </Text>
          </Paper>
        ))}
      </Stack>
      <Text size="xs" c="dimmed" mt="md">
        Click this rail to return to editing.
      </Text>
    </Paper>
  );
}

function SheetPage({ page }: { page: 1 | 2 }) {
  return (
    <Paper className={styles.sheetPage} aria-label={`Faction sheet page ${page}`}>
      <div className={styles.sheetTitle}>{page === 1 ? 'HOUSE MERIDIA' : 'KARAMA EFFECTS'}</div>
      {page === 1 ? (
        <>
          <div className={styles.sheetToken}>M</div>
          <div className={styles.sheetSetup}>
            <strong>AT START:</strong> Starting spice: 10 · Place your forces on Meridian Prime.
            <br />
            <strong>REVIVAL:</strong> Revive one force for free.
          </div>
          <div className={styles.sheetColumns}>
            <SheetRule title="PRESCIENCE" />
            <SheetRule title="ALLIANCE" />
            <SheetRule title="FATE" />
            <SheetRule title="PLANETARY NETWORK" />
          </div>
        </>
      ) : (
        <div className={styles.sheetDetails}>
          <SheetRule title="KARAMA EFFECTS" />
          <div className={styles.sheetSectionTitle}>TROOPS</div>
          <SheetTroop name="Meridian Guard" count={20} />
          <SheetTroop name="Oracle" count={5} />
          <div className={styles.sheetSectionTitle}>LEADERS</div>
          <div className={styles.sheetLeaderRow}>
            {['1', '2', '3', '4', '5'].map((strength) => (
              <span key={strength}>{strength}</span>
            ))}
          </div>
        </div>
      )}
      <Text className={styles.pageNumber}>Page {page}</Text>
    </Paper>
  );
}

function SheetRule({ title }: { title: string }) {
  return (
    <div className={styles.sheetRule}>
      <strong>{title}:</strong> This representative rule text shows how readable the sheet feels at
      this panel size.
    </div>
  );
}

function SheetTroop({ name, count }: { name: string; count: number }) {
  return (
    <Group wrap="nowrap" gap="sm" className={styles.sheetTroop}>
      <span className={styles.sheetTroopToken}>M</span>
      <div>
        <strong>
          {name} ×{count}
        </strong>
        <div>Representative troop description and reverse-side notes.</div>
      </div>
    </Group>
  );
}

function PrototypeSwitcher({
  current,
  onSelect,
}: {
  current: Variant;
  onSelect: (variant: Variant) => void;
}) {
  const index = variants.findIndex((variant) => variant.key === current);
  const previous = variants[(index - 1 + variants.length) % variants.length];
  const next = variants[(index + 1) % variants.length];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') onSelect(previous.key);
      if (event.key === 'ArrowRight') onSelect(next.key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next.key, onSelect, previous.key]);

  return (
    <Paper className={styles.prototypeSwitcher} shadow="xl" radius="xl" p={6}>
      <ActionIcon
        variant="subtle"
        aria-label="Previous prototype"
        onClick={() => onSelect(previous.key)}
      >
        <ArrowLeft size={18} />
      </ActionIcon>
      <Text size="sm" fw={700} px="sm">
        {current} — {variants[index]?.name}
      </Text>
      <ActionIcon variant="subtle" aria-label="Next prototype" onClick={() => onSelect(next.key)}>
        <ArrowRight size={18} />
      </ActionIcon>
    </Paper>
  );
}
