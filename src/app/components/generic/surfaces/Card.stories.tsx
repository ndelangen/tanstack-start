import preview from '@storybook/preview';
import { Card } from './Card';

const meta = preview.meta({
  component: Card,
});

export const Default = meta.story({
  args: {
    children: <p>Card body content</p>,
  },
});

export const WithHeader = meta.story({
  args: {
    header: <h3>Card Header</h3>,
    children: <p>Body with a heading above.</p>,
  },
});
