import React, { FC } from 'react';
import { ReteNode } from '../../types';
import { Rete } from '../../types';
import { Label } from '../common';
import { DefaultValueCan } from './DefaultValueCan';

interface BoolViewProps {
  node: ReteNode;
  dataKey: string;
  label?: string;
  onChange: (v: boolean) => void;
  control: BoolControl;
  isIO?: boolean;
  checkDisable?: (node: ReteNode, key: string) => boolean;
}

const BoolView: FC<BoolViewProps> = ({ node, dataKey, label, onChange, isIO, checkDisable }) => {
  const nodeValue = node.getValue(dataKey);
  const disabled = checkDisable?.(node, dataKey);

  return (
    <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
      <Label label={label} disabled={disabled}>
        {/* @ts-ignore */}
        <input
          style={{ margin: '0 5px' }}
          type="checkbox"
          checked={nodeValue}
          onChange={e => onChange(!nodeValue)}
          disabled={disabled}
        />
      </Label>
    </DefaultValueCan>
  );
};

export class BoolControl extends Rete.Control {
  props: BoolViewProps;
  component = BoolView;

  constructor(key: string, node: ReteNode, label?: string, isIO = true, checkDisable?: (node: ReteNode, key: string) => boolean) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      dataKey: key,
      control: this,
      label,
      isIO,
      checkDisable,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
