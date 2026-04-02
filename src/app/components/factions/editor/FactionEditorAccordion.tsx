import { Image as ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import accordionStyles from '@app/components/generic/surfaces/Accordion.module.css';

import { type FactionEditorSectionId } from './useEditorAccordionHash';

const ACCORDION_SECTION_ICON_SRC: Partial<Record<FactionEditorSectionId, string>> = {
  identity: '/vector/icon/eye.svg',
  hero: '/vector/generic/ceasar.svg',
  leaders: '/vector/icon/traitor.svg',
  decals: '/vector/icon/alliance.svg',
  troops: '/vector/troop/atreides.svg',
  rules: '/vector/icon/balance.svg',
  advantages: '/vector/icon/kwisatz.svg',
};

export function renderAccordionIcon(sectionId: FactionEditorSectionId): ReactNode {
  const src = ACCORDION_SECTION_ICON_SRC[sectionId];
  if (src == null) {
    if (sectionId === 'background') return <ImageIcon size={15} aria-hidden />;
    return null;
  }
  return (
    <img
      className={accordionStyles.headerIconImage}
      src={src}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}
