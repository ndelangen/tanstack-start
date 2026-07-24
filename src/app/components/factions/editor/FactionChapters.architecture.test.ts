import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const fieldsSource = readFileSync(new URL('./FactionFormFields.tsx', import.meta.url), 'utf8');
const troopsSource = readFileSync(
  new URL('./FactionFormSectionTroops.tsx', import.meta.url),
  'utf8'
);
const troopSideSource = readFileSync(new URL('./TroopSideFields.tsx', import.meta.url), 'utf8');
const planetsSource = readFileSync(
  new URL('./FactionFormSectionPlanets.tsx', import.meta.url),
  'utf8'
);
const rulesSource = readFileSync(new URL('./FactionFormSectionRules.tsx', import.meta.url), 'utf8');
const advantagesSource = readFileSync(
  new URL('./FactionFormSectionAdvantages.tsx', import.meta.url),
  'utf8'
);

describe('Forces and Worlds and Rules and Advantages chapter architecture', () => {
  it('gives worlds, forces, rules, and advantages separate main tabs', () => {
    for (const chapter of [
      "chapter.id === 'worlds'",
      "chapter.id === 'forces'",
      "chapter.id === 'rules'",
      "chapter.id === 'advantages'",
    ]) {
      expect(fieldsSource).toContain(chapter);
    }
    expect(fieldsSource).toContain('<FactionFormSectionPlanets form={form}');
    expect(fieldsSource).toContain('<FactionFormSectionTroops form={form} showPreview={false}');
    expect(fieldsSource).toContain('<FactionFormSectionRules form={form}');
    expect(fieldsSource).toContain('<FactionFormSectionAdvantages form={form}');
  });

  it('uses Mantine directly for the newly owned application presentation', () => {
    for (const source of [
      troopsSource,
      troopSideSource,
      planetsSource,
      advantagesSource,
      rulesSource,
    ]) {
      expect(source).toContain("from '@mantine/core'");
      expect(source).not.toContain("from '@app/components/generic/ui");
    }
    for (const source of [troopsSource, troopSideSource, planetsSource, advantagesSource]) {
      expect(source).not.toContain("from '@app/components/form/");
    }
  });

  it('preserves pointer and keyboard ordering for troops, planets, and advantages', () => {
    for (const source of [troopsSource, planetsSource, advantagesSource]) {
      expect(source).toContain('PointerSensor');
      expect(source).toContain('KeyboardSensor');
      expect(source).toContain('sortableKeyboardCoordinates');
      expect(source).toContain('Drag to reorder');
    }
  });

  it('uses only the informative troop renderer and removes previews on mobile', () => {
    expect(troopsSource).toContain('TroopToken');
    expect(troopsSource).toContain('visibleFrom="sm"');
    expect(planetsSource).toContain('To be implemented later');
    expect(planetsSource).not.toContain('@game/assets/');
    expect(planetsSource).not.toContain('PlanetToken');
  });

  it('does not introduce modal, accordion, or nested scrolling chapter UI', () => {
    for (const source of [troopsSource, planetsSource, rulesSource, advantagesSource]) {
      expect(source).not.toContain('Modal');
      expect(source).not.toContain('Accordion');
      expect(source).not.toContain('ScrollArea');
    }
  });
});
