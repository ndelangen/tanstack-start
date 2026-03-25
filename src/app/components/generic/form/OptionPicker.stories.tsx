import { useState } from 'react';

import preview from '@storybook/preview';
import { OptionPicker } from './OptionPicker';

const meta = preview.meta({
  component: OptionPicker,
});

export const Default = meta.story({
  render: function OptionPickerDemo() {
    const [value, setValue] = useState('a');
    return (
      <OptionPicker
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
      />
    );
  },
});
