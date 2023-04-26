import React, { FC, useState } from 'react';
import { ValueType } from '../../types';
import { capitalizeFirstLetter, removeWhiteSpace } from '../../utils';
import { Select } from '../common';

export type ListIOItemValue = { name: string; type: ValueType };
const Options = [
  ValueType.float,
  ValueType.vec2,
  ValueType.vec3,
  ValueType.vec4,
  ValueType.mat2,
  ValueType.mat3,
  ValueType.mat4,
  ValueType.texture2d,
];
export const ListIOItem: FC<{ list: ListIOItemValue[]; value: ListIOItemValue; onChange: () => void }> = ({ list, value, onChange }) => {
  const [name, setName] = useState(value.name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0' }}>
      <input
        style={{ background: 'transparent', border: 'none', color: '#0c0c0c', display: 'block', width: '100px', marginLeft: '5px' }}
        value={name}
        onBlur={() => {
          if (!name) return setName(value.name);

          let nextName = capitalizeFirstLetter(removeWhiteSpace(name));
          let i = 0;
          while (list.some(i => i !== value && i.name === nextName)) {
            nextName = name + String(i++);
          }

          value.name = nextName;
          setName(nextName);
          onChange();
        }}
        onChange={e => setName(e.target.value)}
      />
      <Select
        style={{ margin: 0 }}
        value={value.type}
        options={Options}
        onChange={v => {
          value.type = v;
          onChange();
        }}
      />
    </div>
  );
};
