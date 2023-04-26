import React, { FC } from 'react';
import { Rete, ReteNode } from '../../types';
import { DefaultValueCan } from './DefaultValueCan';
import { InputFloat, VectorLabelNameMap } from '../common';

export const Float: FC<{
  node: ReteNode;
  dataKey: string;
  onChange: (v: number) => void;
  control: FloatControl;
}> = ({ node, dataKey, onChange, control }) => (
  <DefaultValueCan node={node} dataKey={dataKey}>
    <InputFloat
      label={control.parent?.name ? VectorLabelNameMap[control.parent.name] || 'X' : 'X'}
      value={node.getValue(dataKey)}
      onChange={onChange}
    />
  </DefaultValueCan>
);

export class FloatControl extends Rete.Control {
  props: {
    onChange: (val: any) => void;
    readonly: boolean;
    node: ReteNode;
    dataKey: string;
    control: FloatControl;
  };
  component: any;

  constructor(key: string, node: ReteNode, readonly = false) {
    super(key);
    this.component = Float;
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
