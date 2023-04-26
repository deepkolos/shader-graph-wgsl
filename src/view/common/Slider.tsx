import './Slider.less';
import React, { FC } from 'react';
import { useThrottledCallback } from 'use-debounce';
import { Label } from './Label';
import { stopPropagation } from '../utils';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  onChange: (v: number) => void;
}

export const Slider: FC<SliderProps> = ({ value, onChange, min, max, label, step }) => {
  const onChangeThrottled = useThrottledCallback(e => {
    let value = e.target.value;
    if (min !== undefined && max !== undefined) value = Math.max(min, Math.min(max, Number(value)));
    onChange(value);
  }, 28);

  return (
    <Label label={label} className="sg-slider">
      <input
        className="sg-slider-range"
        // @ts-ignore
        value={value}
        // @ts-ignore
        type="range"
        min={min}
        max={max}
        step={step}
        onChange={onChangeThrottled}
        onPointerDownCapture={stopPropagation}
      />
      {/* @ts-ignore */}
      <input className="sg-slider-number" type="number" value={value} onChange={onChangeThrottled} />
    </Label>
  );
};
