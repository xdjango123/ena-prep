import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium text-neutral-700 mb-1 ${className}`}
      {...props}
    />
  )
);
Label.displayName = 'Label'; 