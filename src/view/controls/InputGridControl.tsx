import React, { FC, useEffect, useState } from 'react';
import { ReteNode, ValueType } from '../../types';
import { Rete } from '../../types';
import { InputGrid, Label } from '../common';
import { DefaultValueCan } from './DefaultValueCan';

interface InputGridViewProps {
  node: ReteNode;
  dataKey: string;
  label?: string;
  onChange: (v: number[]) => void;
  control: InputGridControl;
  isIO?: boolean;
}

const ValueTypeGridMap = {
  [ValueType.mat2]: [2, 2],
  [ValueType.mat3]: [3, 3],
  [ValueType.mat4]: [4, 4],
} as const;

const InputGridView: FC<InputGridViewProps> = ({ node, dataKey, label, onChange, isIO }) => {
  const nodeValue = node.getValue(dataKey);
  const valueType = node.getValueType(dataKey);
  // @ts-ignore
  const [gridX, gridY] = ValueTypeGridMap[valueType] || [0, 0];
  const [value, setValue] = useState<string>(nodeValue);

  useEffect(() => {
    if (nodeValue !== value) setValue(nodeValue);
  }, [nodeValue]);

  return (
    <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
      <Label label={label}>
        <InputGrid gridX={gridX} gridY={gridY} value={nodeValue} onChange={onChange} />
      </Label>
    </DefaultValueCan>
  );
};

export class InputGridControl extends Rete.Control {
  props: InputGridViewProps;
  component = InputGridView;

  constructor(key: string, node: ReteNode, label?: string, isIO = true) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      dataKey: key,
      control: this,
      label,
      isIO,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
