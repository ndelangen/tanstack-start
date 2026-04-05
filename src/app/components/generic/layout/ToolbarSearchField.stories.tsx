import preview from '@sb/preview';
import { useState } from 'react';

import { Toolbar } from './Toolbar';
import { ToolbarSearchField } from './ToolbarSearchField';

const meta = preview.meta({
  component: ToolbarSearchField,
  parameters: {
    layout: 'padded',
  },
});

export const Standalone = meta.story({
  render: function ToolbarSearchFieldDemo() {
    const [value, setValue] = useState('');
    return (
      <ToolbarSearchField
        value={value}
        onValueChange={setValue}
        placeholder="Filter…"
        aria-label="Demo search"
      />
    );
  },
});

export const InToolbar = meta.story({
  render: function ToolbarWithSearchDemo() {
    const [value, setValue] = useState('');
    return (
      <Toolbar>
        <Toolbar.Left>
          <button type="button">Action</button>
          <ToolbarSearchField
            value={value}
            onValueChange={setValue}
            placeholder="Search…"
            aria-label="Toolbar search"
          />
        </Toolbar.Left>
        <Toolbar.Right>
          <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>Meta</span>
        </Toolbar.Right>
      </Toolbar>
    );
  },
});
