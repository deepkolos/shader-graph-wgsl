import './Select.less';
import React, { FC } from 'react';
import { DefaultProps } from './types';

interface SelectProps extends DefaultProps {
  value: any;
  options: Array<string | { label: string; value: any }>;
  onChange: (value: any) => void;
}
export const Select: FC<SelectProps> = ({ style, className, value, options, onChange }) => {
  return (
    <select style={style} className={`sg-select ${className || ''}`} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(option =>
        typeof option === 'string' ? (
          <option value={option} key={option}>
            {option}
          </option>
        ) : (
          <option value={option.value} key={option.label}>
            {option.label}
          </option>
        ),
      )}
    </select>
  );
};
