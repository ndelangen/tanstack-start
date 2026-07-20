import { useCallback } from 'react';

import { AccordionSection } from '@app/components/generic/surfaces/Accordion';
import { TopicIcon } from '@app/components/topics/TopicIcon';

import styles from './FactionEditor.module.css';
import { FactionFormSectionAdvantages } from './FactionFormSectionAdvantages';
import { FactionFormSectionBackground } from './FactionFormSectionBackground';
import { FactionFormSectionDecals } from './FactionFormSectionDecals';
import { FactionFormSectionHero } from './FactionFormSectionHero';
import { FactionFormSectionIdentity } from './FactionFormSectionIdentity';
import { FactionFormSectionLeaders } from './FactionFormSectionLeaders';
import { FactionFormSectionRules } from './FactionFormSectionRules';
import { FactionFormSectionTroops } from './FactionFormSectionTroops';
import type { FactionFormApi } from './factionFormTypes';
import { type FactionEditorSectionId, useEditorAccordionHash } from './useEditorAccordionHash';

export type { FactionFormApi } from './factionFormTypes';

export function FactionFormFields({ form }: { form: FactionFormApi }) {
  const { openId, openSection } = useEditorAccordionHash();
  const onAccordionToggle = useCallback(
    (id: string) => openSection(id as FactionEditorSectionId),
    [openSection]
  );

  return (
    <div className={styles.formColumn}>
      <AccordionSection
        sectionId="identity"
        title="Identity"
        icon={<TopicIcon topic="identity" />}
        isOpen={openId === 'identity'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionIdentity form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="background"
        title="Background"
        icon={<TopicIcon topic="background" />}
        isOpen={openId === 'background'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionBackground form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="hero"
        title="Hero"
        icon={<TopicIcon topic="hero" />}
        isOpen={openId === 'hero'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionHero form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="leaders"
        title="Leaders"
        icon={<TopicIcon topic="leaders" />}
        isOpen={openId === 'leaders'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionLeaders form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="decals"
        title="Alliance decals"
        icon={<TopicIcon topic="decals" />}
        isOpen={openId === 'decals'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionDecals form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="troops"
        title="Troops"
        icon={<TopicIcon topic="troops" />}
        isOpen={openId === 'troops'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionTroops form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="rules"
        title="Rules"
        icon={<TopicIcon topic="rules" />}
        isOpen={openId === 'rules'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionRules form={form} />
      </AccordionSection>

      <AccordionSection
        sectionId="advantages"
        title="Advantages"
        icon={<TopicIcon topic="advantages" />}
        isOpen={openId === 'advantages'}
        onToggle={onAccordionToggle}
      >
        <FactionFormSectionAdvantages form={form} />
      </AccordionSection>
    </div>
  );
}
