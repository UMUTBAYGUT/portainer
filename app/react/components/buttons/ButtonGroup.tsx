import { PropsWithChildren } from 'react';
import clsx from 'clsx';

export type Size = 'xsmall' | 'small' | 'large';
export interface Props {
  size?: Size;
  className?: string;
}

export function ButtonGroup({
  size,
  children,
  className,
}: PropsWithChildren<Props>) {
  return (
    <div className={clsx('btn-group', sizeClass(size), className)} role="group">
      {children}
    </div>
  );
}

function sizeClass(size: Size | undefined) {
  switch (size) {
    case 'small':
      return 'btn-group-sm';
    case 'xsmall':
      return 'btn-group-xs';
    case 'large':
      return 'btn-group-lg';
    default:
      return '';
  }
}
