import preview from '@storybook/preview';
import { Page } from './Page';

const meta = preview.meta({
  component: Page,
});

export const Default = meta.story({
  args: {
    head: <h1>Page Title</h1>,
    content: (
      <main>
        <p>Shared page shell content.</p>
      </main>
    ),
  },
});

export const Minimal = meta.story({
  args: {
    content: (
      <main>
        <p>Page content without a header section.</p>
      </main>
    ),
  },
});
