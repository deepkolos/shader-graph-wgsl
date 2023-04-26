import './Label.less';
import React, { FC } from 'react';
import { DefaultProps } from './types';

interface LabelProps extends DefaultProps {
  label?: string;
}

export const Label: FC<LabelProps> = ({ label, children, className = '' }) =>
  label !== undefined ? (
    <div className={`sg-label-can ${className}`}>
      {label && <div className="sg-label">{label}</div>}
      {children}
    </div>
  ) : (
    <>{children}</>
  );
