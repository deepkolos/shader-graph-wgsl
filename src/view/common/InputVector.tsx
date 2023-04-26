import React, { FC } from 'react';
import { ValueType } from '../../types';
import { InputFloat } from './InputFloat';

export const VectorLabelNameMap: { [k: string]: string } = {
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  W: 'W',
};

interface InputVectorProps {
  labelX?: string;
  value: number | number[];
  valueType: ValueType;
  onChange: (value: number | number[]) => void;
}

export const InputVector: FC<InputVectorProps> = ({ labelX, valueType, value, onChange }) => {
  const set = (index: number, v: number) => {
    const out = [...(value as number[])];
    out[index] = v;
    onChange(out);
  };

  const arr = value as number[];

  return (
    <>
      {valueType === ValueType.float && (
        <InputFloat
          label={labelX ? VectorLabelNameMap[labelX] || 'X' : 'X'}
          value={value as number}
          onChange={onChange as any}
        />
      )}

      {valueType === ValueType.vec2 && (
        <>
          <InputFloat label="X" value={arr[0]} onChange={(v: number) => set(0, v)} />
          <InputFloat label="Y" value={arr[1]} onChange={(v: number) => set(1, v)} />
        </>
      )}
      {valueType === ValueType.vec3 && (
        <>
          <InputFloat label="X" value={arr[0]} onChange={(v: number) => set(0, v)} />
          <InputFloat label="Y" value={arr[1]} onChange={(v: number) => set(1, v)} />
          <InputFloat label="Z" value={arr[2]} onChange={(v: number) => set(2, v)} />
        </>
      )}
      {valueType === ValueType.vec4 && (
        <>
          <InputFloat label="X" value={arr[0]} onChange={(v: number) => set(0, v)} />
          <InputFloat label="Y" value={arr[1]} onChange={(v: number) => set(1, v)} />
          <InputFloat label="Z" value={arr[2]} onChange={(v: number) => set(2, v)} />
          <InputFloat label="W" value={arr[3]} onChange={(v: number) => set(3, v)} />
        </>
      )}
    </>
  );
};
