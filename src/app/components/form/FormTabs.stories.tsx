import preview from '@sb/preview';
import { useState } from 'react';

import { FormTabs, type FormTabsItem, FormTabsPanel } from './FormTabs';

const meta = preview.meta({
  component: FormTabs,
});

function TabsExample() {
  const items: FormTabsItem[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'details', label: 'Details' },
    { value: 'settings', label: 'Settings', disabled: true },
  ];
  const [value, setValue] = useState(items[0]?.value ?? 'overview');

  return (
    <FormTabs value={value} onValueChange={setValue} items={items}>
      <FormTabsPanel value="overview">
        <p>Overview content.</p>
      </FormTabsPanel>
      <FormTabsPanel value="details">
        <p>Details content.</p>
      </FormTabsPanel>
      <FormTabsPanel value="settings">
        <p>Settings are disabled in this example.</p>
      </FormTabsPanel>
    </FormTabs>
  );
}

export const Default = meta.story({
  render: () => <TabsExample />,
});
