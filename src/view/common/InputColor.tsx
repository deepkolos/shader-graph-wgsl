import React, { FC } from 'react';
import { useThrottledCallback } from 'use-debounce';
import { clamp } from '../../plugins/connect-plugin/utils';

const HexToVec3 = (style: string): number[] => {
  const m = /^\#([A-Fa-f\d]+)$/.exec(style);
  if (!m) return [0, 0, 0];
  const hex = m[1];
  const r = parseInt(hex.charAt(0) + hex.charAt(1), 16) / 255;
  const g = parseInt(hex.charAt(2) + hex.charAt(3), 16) / 255;
  const b = parseInt(hex.charAt(4) + hex.charAt(5), 16) / 255;
  return [r, g, b];
};
const clamp8Bit = (v: number) => clamp(v, 0, 255);

const Vec3ToHex = (vec3: number[]): string => {
  const [r, g, b] = vec3;
  const hex = (clamp8Bit(r * 255) << 16) ^ (clamp8Bit(g * 255) << 8) ^ (clamp8Bit(b * 255) << 0);

  return `#${hex.toString(16).padStart(6, '0')}`;
};

interface InputColorProps {
  value: number[];
  onChange: (value: number[]) => void;
}
export const InputColor: FC<InputColorProps> = ({ value, onChange }) => {
  const onChangeThrottled = useThrottledCallback(e => onChange(HexToVec3(e.target.value)), 28);
  // @ts-ignore
  return <input type="color" value={Vec3ToHex(value)} onChange={onChangeThrottled} />;
};
