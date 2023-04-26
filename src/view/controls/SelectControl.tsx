import React, { FC } from 'react';
import { ReteNode } from '../../types';
import { Rete } from '../../types';
import { Label, Select } from '../common';
import { DefaultValueCan } from './DefaultValueCan';

interface SelectViewProps {
  node: ReteNode;
  dataKey: string;
  label?: string;
  onChange: (v: number) => void;
  control: SelectControl;
  options: Array<string | { label: string; value: any }>;
  isIO?: boolean;
}

export const SelectView: FC<SelectViewProps> = ({ node, dataKey, options, label, onChange, isIO }) => (
  <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
    <Label label={label}>
      <Select value={node.getValue(dataKey)} options={options} onChange={onChange} />
    </Label>
  </DefaultValueCan>
);

export class SelectControl extends Rete.Control {
  props: SelectViewProps;
  component = SelectView;

  constructor(key: string, node: ReteNode, label: string | undefined, options: Array<string | { label: string; value: any }>, isIO = true) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      dataKey: key,
      control: this,
      label,
      options,
      isIO,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
