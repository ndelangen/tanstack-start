import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import type { Faction } from '@db/factions';
import { FactionSchema } from '@game/schema/faction';

import styles from './FactionEditor.module.css';

const DEBOUNCE_MS = 100;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

function sendFactionToIframe(iframe: HTMLIFrameElement | null, faction: Faction) {
  const win = iframe?.contentWindow;
  if (!win) {
    return;
  }
  const parsed = FactionSchema.safeParse(faction);
  if (!parsed.success) {
    return;
  }
  win.postMessage(
    { v: 1, type: 'faction:sheet:set', payload: parsed.data },
    window.location.origin
  );
}

export function FactionSheetPreviewIframe({ faction }: { faction: Faction }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const factionRef = useRef(faction);
  factionRef.current = faction;

  const slug = faction.id;
  const iframeSrc = `/factions/${encodeURIComponent(slug)}/sheet?mode=live`;

  const factionSnapshot = useMemo(() => JSON.stringify(faction), [faction]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-schedule debounce when serialized faction changes
  useEffect(() => {
    const id = window.setTimeout(() => {
      sendFactionToIframe(iframeRef.current, factionRef.current);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [factionSnapshot]);

  // iframe asks for data after its postMessage listener is ready (avoids racing iframe onLoad).
  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data;
      if (!isRecord(data)) {
        return;
      }
      if (data.v !== 1 || data.type !== 'faction:sheet:request') {
        return;
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      sendFactionToIframe(iframeRef.current, factionRef.current);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className={styles.sheetIframeWrap}>
      <iframe
        ref={iframeRef}
        key={slug}
        className={styles.sheetIframe}
        src={iframeSrc}
        title="Faction sheet preview"
      />
    </div>
  );
}
