import './InputGrid.less';
import React, { FC } from 'react';

const arr = (len: number) => new Array(len).fill(0);

interface InputGridProps {
  value: number[];
  gridX: number;
  gridY: number;
  onChange: (v: number[]) => void;
}
// 列主序
export const InputGrid: FC<InputGridProps> = ({ value, onChange, gridX, gridY }) => {
  return (
    <div className="sg-input-grid">
      {arr(gridY).map((_, row) => (
        <div className="sg-input-grid-row" key={row}>
          {arr(gridX).map((_, col) => (
            <input
              type="number"
              className="sg-input-grid-item"
              key={`${row}_${col}`}
              value={value[col * gridX + row]}
              onChange={e => {
                value[col * gridX + row] = e.target.value as any;
                onChange(value);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
