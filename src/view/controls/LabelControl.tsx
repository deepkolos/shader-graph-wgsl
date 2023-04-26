import React, { FC } from 'react';
import { ReteNode } from '../../types';
import { Rete } from '../../types';
import { DefaultValueCan } from './DefaultValueCan';

interface LabelProps {
  node: ReteNode;
  dataKey: string;
  label: string;
  onChange: (v: number) => void;
  control: LabelControl;
}

const Label: FC<LabelProps> = ({ node, dataKey, label }) => (
  <DefaultValueCan node={node} dataKey={dataKey}>
    <div style={{ whiteSpace: 'nowrap', marginLeft: '10px' }}>{label}</div>
  </DefaultValueCan>
);

export class LabelControl extends Rete.Control {
  props: LabelProps;
  component = Label;

  constructor(key: string, node: ReteNode, label: string) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      label,
      dataKey: key,
      control: this,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
