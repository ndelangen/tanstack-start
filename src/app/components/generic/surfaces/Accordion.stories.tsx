import preview from '@sb/preview';
import { useState } from 'react';

import { AccordionSection } from './Accordion';

const meta = preview.meta({
  component: AccordionSection,
});

export const SingleSection = meta.story({
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ width: 'min(100%, 22rem)' }}>
        <AccordionSection
          sectionId="demo"
          title="Example section"
          isOpen={open}
          onToggle={() => setOpen((o) => !o)}
        >
          <p style={{ margin: 0 }}>Panel content goes here.</p>
        </AccordionSection>
      </div>
    );
  },
});

export const WithIcon = meta.story({
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ width: 'min(100%, 22rem)' }}>
        <AccordionSection
          sectionId="with-icon"
          title="With leading icon"
          icon={
            <span style={{ fontSize: '0.85rem' }} aria-hidden>
              ◆
            </span>
          }
          isOpen={open}
          onToggle={() => setOpen((o) => !o)}
        >
          <p style={{ margin: 0 }}>Icon slot is optional.</p>
        </AccordionSection>
      </div>
    );
  },
});
