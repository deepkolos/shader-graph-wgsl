import './Label.less';
import React, { FC } from 'react';
import { DefaultProps } from './types';

interface LabelProps extends DefaultProps {
  label?: string;
  disabled?: boolean;
}

export const Label: FC<LabelProps> = ({ label, children, className = '', disabled }) =>
  label !== undefined ? (
    <div className={`sg-label-can ${className}`}>
      {label && <div className="sg-label" data-aria-disabled={disabled}>{label}</div>}
      {children}
    </div>
  ) : (
    <>{children}</>
  );
