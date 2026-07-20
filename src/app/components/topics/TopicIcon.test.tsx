import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TopicIcon, type TopicIconTopic } from './TopicIcon';

const IMAGE_TOPICS: Array<[TopicIconTopic, string]> = [
  ['identity', '/vector/icon/eye.svg'],
  ['hero', '/vector/generic/ceasar.svg'],
  ['leaders', '/vector/icon/traitor.svg'],
  ['alliance', '/vector/icon/alliance.svg'],
  ['decals', '/vector/icon/alliance.svg'],
  ['troops', '/vector/troop/atreides.svg'],
  ['rules', '/vector/icon/balance.svg'],
  ['advantages', '/vector/icon/kwisatz.svg'],
];

describe('TopicIcon', () => {
  it.each(IMAGE_TOPICS)('maps %s to %s', (topic, src) => {
    const markup = renderToStaticMarkup(<TopicIcon topic={topic} />);

    expect(markup).toContain(`src="${src}"`);
    expect(markup).toContain('aria-hidden="true"');
  });

  it('uses the image glyph for the background topic', () => {
    const markup = renderToStaticMarkup(<TopicIcon topic="background" />);

    expect(markup).toContain('<svg');
    expect(markup).toContain('aria-hidden="true"');
  });
});
