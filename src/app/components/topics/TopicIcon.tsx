import { Image as ImageIcon, type LucideIcon } from 'lucide-react';

const TOPIC_ICON_DEFINITIONS = {
  identity: { kind: 'image', src: '/vector/icon/eye.svg' },
  background: { kind: 'component', component: ImageIcon },
  hero: { kind: 'image', src: '/vector/generic/ceasar.svg' },
  leaders: { kind: 'image', src: '/vector/icon/traitor.svg' },
  alliance: { kind: 'image', src: '/vector/icon/alliance.svg' },
  decals: { kind: 'image', src: '/vector/icon/alliance.svg' },
  troops: { kind: 'image', src: '/vector/troop/atreides.svg' },
  rules: { kind: 'image', src: '/vector/icon/balance.svg' },
  advantages: { kind: 'image', src: '/vector/icon/kwisatz.svg' },
} as const satisfies Record<
  string,
  { kind: 'image'; src: string } | { kind: 'component'; component: LucideIcon }
>;

export type TopicIconTopic = keyof typeof TOPIC_ICON_DEFINITIONS;

export interface TopicIconProps {
  topic: TopicIconTopic;
  size?: number;
  className?: string;
}

/**
 * The canonical, decorative icon for a recurring application topic.
 * The surrounding heading or label owns the accessible name.
 */
export function TopicIcon({ topic, size = 16, className }: TopicIconProps) {
  const definition = TOPIC_ICON_DEFINITIONS[topic];

  if (definition.kind === 'component') {
    const Icon = definition.component;
    return <Icon className={className} size={size} aria-hidden />;
  }

  return (
    <img
      className={className}
      src={definition.src}
      alt=""
      aria-hidden
      draggable={false}
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
