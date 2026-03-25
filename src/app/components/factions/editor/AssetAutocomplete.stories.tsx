import preview from '@sb/preview';
import { useState } from 'react';

import { AssetAutocomplete } from './AssetAutocomplete';

const meta = preview.meta({
  component: AssetAutocomplete,
});

export const Default = meta.story({
  render: function AssetAutocompleteDemo() {
    const [value, setValue] = useState('alpha');
    return (
      <AssetAutocomplete
        label="Suggest"
        value={value}
        onChange={setValue}
        options={['alpha', 'beta', 'gamma']}
      />
    );
  },
});
