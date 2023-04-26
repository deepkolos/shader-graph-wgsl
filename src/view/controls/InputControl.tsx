import React, { FC, useEffect, useState } from 'react';
import { ReteNode } from '../../types';
import { Rete } from '../../types';
import { Label } from '../common';
import { DefaultValueCan } from './DefaultValueCan';

interface InputViewProps {
  node: ReteNode;
  dataKey: string;
  label?: string;
  onChange: (v: string) => void;
  onValid?: (v: string) => boolean;
  control: InputControl;
  isIO?: boolean;
}

const InputView: FC<InputViewProps> = ({ node, dataKey, label, onValid, onChange, isIO }) => {
  const nodeValue = node.getValue(dataKey);
  const [value, setValue] = useState<string>(nodeValue);

  useEffect(() => {
    if (nodeValue !== value) setValue(nodeValue);
  }, [nodeValue]);

  return (
    <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
      <Label label={label}>
        <input
          style={{ width: '70px' }}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => (onValid?.(value) ?? true ? onChange(value) : setValue(nodeValue))}
        />
      </Label>
    </DefaultValueCan>
  );
};

export class InputControl extends Rete.Control {
  props: InputViewProps;
  component = InputView;

  constructor(key: string, node: ReteNode, label?: string, onValid?: (value: string) => boolean, isIO = true) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      dataKey: key,
      control: this,
      label,
      onValid,
      isIO,
    };
  }

  setValue = (val: any) => {
    this.setNodeValue(this.key, val);
    this.update();
  };
}
