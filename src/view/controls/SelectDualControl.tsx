import React, { FC } from 'react';
import { ReteNode } from '../../types';
import { Rete } from '../../types';
import { Select } from '../common';

type Options = Array<string | { label: string; value: any }>;
interface SelectDualViewProps {
  node: ReteNode;
  inKey: string;
  outKey: string;
  onInChange: (v: number) => void;
  onOutChange: (v: number) => void;
  inOptions: Options;
  outOptions: Options;
}

export const SelectDualView: FC<SelectDualViewProps> = ({ node, inKey, inOptions, onInChange, outKey, outOptions, onOutChange }) => (
  <div>
    <Select value={node.getValue(inKey)} options={inOptions} onChange={onInChange} />
    👉🏻
    <Select value={node.getValue(outKey)} options={outOptions} onChange={onOutChange} />
  </div>
);

export class SelectDualControl extends Rete.Control {
  props: SelectDualViewProps;
  component = SelectDualView;

  constructor(node: ReteNode, public inKey: string, public outKey: string, inOptions: Options, outOptions: Options) {
    super(inKey);
    this.props = {
      onInChange: this.onInChange,
      onOutChange: this.onOutChange,
      node,
      inKey,
      outKey,
      inOptions,
      outOptions,
    };
  }

  onInChange = (val: any) => {
    this.setNodeValue(this.inKey, val);
    this.update();
  };

  onOutChange = (val: any) => {
    this.setNodeValue(this.outKey, val);
    this.update();
  };
}
