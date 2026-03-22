import type { ComponentPropsWithoutRef } from 'react';

import { Textarea } from '../ui/Input';

export function MultilineTextField(props: ComponentPropsWithoutRef<'textarea'>) {
  const { className, ...rest } = props;
  return <Textarea className={className} {...rest} />;
}
