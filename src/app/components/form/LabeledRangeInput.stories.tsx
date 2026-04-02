import preview from '@sb/preview';
import { useState } from 'react';

import { LabeledRangeInput } from './LabeledRangeInput';

const meta = preview.meta({
  component: LabeledRangeInput,
});

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState(0.42);
    return (
      <div style={{ width: 'min(100%, 20rem)' }}>
        <LabeledRangeInput
          id="story-range"
          label="Opacity (0–1)"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={setValue}
          formatDisplay={(n) => n.toFixed(2)}
        />
      </div>
    );
  },
});

export const IntegerClamped = meta.story({
  render: () => {
    const [value, setValue] = useState(0);
    return (
      <div style={{ width: 'min(100%, 20rem)' }}>
        <LabeledRangeInput
          id="story-int-range"
          label="Offset (−500–500)"
          min={-500}
          max={500}
          step={1}
          integer
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
});
