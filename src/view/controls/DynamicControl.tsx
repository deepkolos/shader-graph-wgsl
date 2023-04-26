import React, { FC } from 'react';
import { Rete, ValueType, ReteNode } from '../../types';
import { InputVector } from '../common';
import { DefaultValueCan } from './DefaultValueCan';

export const Dynamic: FC<{
  node: ReteNode;
  dataKey: string;
  onChange: Function;
  control: DynamicControl;
}> = ({ node, dataKey, onChange, control }) => {
  const valueType: ValueType = node.data[dataKey + 'ValueType'];
  const value: any = node.getValue(dataKey);

  return (
    <DefaultValueCan node={node} dataKey={dataKey}>
      <InputVector valueType={valueType} value={value} onChange={onChange as any} labelX={control.parent?.name} />
    </DefaultValueCan>
  );
};

export class DynamicControl extends Rete.Control {
  props: {
    onChange: (val: any) => void;
    readonly: boolean;
    node: ReteNode;
    dataKey: string;
    control: DynamicControl;
  };
  component = Dynamic;

  constructor(key: string, node: ReteNode, readonly = false) {
    super(key);
    this.props = {
      onChange: this.setValue,
      readonly,
      node,
      dataKey: key,
      control: this,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
