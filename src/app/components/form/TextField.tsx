import type { ComponentPropsWithoutRef } from 'react';

import { Input } from '../ui/Input';

export function TextField(props: ComponentPropsWithoutRef<'input'>) {
  const { className, ...rest } = props;
  return <Input className={className} {...rest} />;
}
