import { useCallback, useLayoutEffect, useState } from 'react';

export const FACTION_EDITOR_SECTIONS = [
  'identity',
  'background',
  'hero',
  'leaders',
  'decals',
  'troops',
  'rules',
  'advantages',
] as const;

export type FactionEditorSectionId = (typeof FACTION_EDITOR_SECTIONS)[number];

function isSectionId(s: string): s is FactionEditorSectionId {
  return (FACTION_EDITOR_SECTIONS as readonly string[]).includes(s);
}

function readHashId(): FactionEditorSectionId {
  if (typeof window === 'undefined') return 'identity';
  const h = window.location.hash.slice(1);
  return isSectionId(h) ? h : 'identity';
}

function writeHash(id: FactionEditorSectionId) {
  const next = `${window.location.pathname}${window.location.search}#${id}`;
  window.history.replaceState(null, '', next);
}

/**
 * Single open accordion section, kept in sync with `location.hash` (e.g. `#background`).
 */
export function useEditorAccordionHash() {
  const [openId, setOpenId] = useState<FactionEditorSectionId>('identity');

  useLayoutEffect(() => {
    const sync = () => setOpenId(readHashId());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const openSection = useCallback((id: FactionEditorSectionId) => {
    setOpenId(id);
    writeHash(id);
  }, []);

  return { openId, openSection };
}
