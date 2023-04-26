import './InputFloat.less';
import React, { FC, useEffect, useRef } from 'react';
import { preventDefault } from '../utils';
import { listenWindow } from '../../rete/view/utils';

export const InputFloat: FC<{
  value: number;
  label: string;
  onChange: (value: number) => void;
  sensitivity?: number;
}> = ({ value, onChange, label, sensitivity = 0.005 }) => {
  const pointerState = useRef({ sx: 0, sy: 0, sv: +value, down: false, onChange });
  pointerState.current.onChange = onChange;

  useEffect(() => {
    const disposeMove = listenWindow('pointermove', e => {
      const state = pointerState.current;
      if (state.down) {
        const deltaX = e.clientX - state.sx;
        state.onChange(Number((state.sv + deltaX * sensitivity).toFixed(2)));
      }
    });
    const disposeUp = listenWindow('pointerup', () => {
      pointerState.current.down = false;
    });

    return () => {
      disposeMove();
      disposeUp();
    };
  }, []);

  return (
    <>
      <div
        className="sg-float-label"
        onPointerDownCapture={e => {
          e.stopPropagation();
          e.preventDefault();
          const state = pointerState.current;
          state.sx = e.clientX;
          state.sy = e.clientY;
          state.sv = Number(value);
          state.down = true;
        }}
        onPointerMove={preventDefault as any}>
        {label}
      </div>
      {/* @ts-ignore */}
      <input type="number" className="sg-float-input" value={value} onChange={e => onChange(e.target.value as any)} />
    </>
  );
};
