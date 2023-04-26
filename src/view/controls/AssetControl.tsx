import React, { FC } from 'react';
import { AssetValue, Rete, ReteNode } from '../../types';
import { DefaultValueCan } from './DefaultValueCan';
import { InputAsset, Label } from '../common';

interface AssetProps {
  node: ReteNode;
  dataKey: string;
  editor: Rete.NodeEditor;
  onChange: (v: AssetValue) => void;
  control: AssetControl;
  isIO: boolean;
  label?: string;
}

export const Asset: FC<AssetProps> = ({ editor, node, dataKey, onChange, isIO, label }) => (
  <DefaultValueCan node={node} dataKey={dataKey} asEmptyWrapper={!isIO}>
    <Label label={label}>
      <InputAsset editor={editor} value={node.getValue(dataKey)} valueType={node.getValueType(dataKey) as any} onChange={onChange} />
    </Label>
  </DefaultValueCan>
);

export class AssetControl extends Rete.Control {
  props: AssetProps;
  component = Asset;

  constructor(key: string, node: ReteNode, editor: Rete.NodeEditor, isIO = true, label?: string) {
    super(key);
    this.props = {
      onChange: this.setValue,
      node,
      editor,
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
