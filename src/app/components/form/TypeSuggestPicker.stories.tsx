import { useState } from 'react';

import preview from '../../../../.storybook/preview';
import { AssetAutocomplete as TypeSuggestPicker } from '../factions/editor/AssetAutocomplete';

const meta = preview.meta({
  component: TypeSuggestPicker,
});

export const Default = meta.story({
  render: function TypeSuggestPickerDemo() {
    const [value, setValue] = useState('alpha');
    return (
      <TypeSuggestPicker
        label="Suggest"
        value={value}
        onChange={setValue}
        options={['alpha', 'beta', 'gamma']}
      />
    );
  },
});
