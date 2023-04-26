import React, { FC } from 'react';
import { Rete, ReteNode } from '../../types';
import { DefaultValueCan } from './DefaultValueCan';
import { InputColor, Label } from '../common';

interface ColorProps {
  node: ReteNode;
  dataKey: string;
  onChange: (v: number[]) => void;
  control: ColorControl;
  isIO: boolean;
  label?: string;
}

export const Color: FC<ColorProps> = ({ node, dataKey, onChange, isIO, label }) => (
  <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
    <Label label={label}>
      <InputColor value={node.getValue(dataKey)} onChange={onChange} />
    </Label>
  </DefaultValueCan>
);

export class ColorControl extends Rete.Control {
  props: ColorProps;
  component = Color;

  constructor(key: string, node: ReteNode, isIO = true, label?: string) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      dataKey: key,
      control: this,
      isIO,
      label,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
