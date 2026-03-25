import clsx from 'clsx';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { textFieldClassNames } from './TextField';

export type MultilineTextFieldProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'className'> & {
  className?: string;
  padded?: boolean;
};

export const MultilineTextField = forwardRef<HTMLTextAreaElement, MultilineTextFieldProps>(
  function MultilineTextField({ className, padded = false, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx(textFieldClassNames({ variant: 'textarea', padded }), className)}
        {...rest}
      />
    );
  }
);
