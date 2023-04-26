import './InputAsset.less';
import React, { FC } from 'react';
import { AssetValue, Rete, ValueType, ValueTypeNameMap } from '../../types';

interface InputAssetProps {
  editor: Rete.NodeEditor;
  value: AssetValue;
  valueType: ValueType;
  onChange: (asset: AssetValue) => void;
}

export const InputAsset: FC<InputAssetProps> = ({ editor, value, valueType, onChange }) => {
  const icon = () => {
    let url = '';
    editor.trigger('assetparse', {
      asset: value,
      type: valueType,
      callback: src => (url = src),
    });
    return url;
  };

  const onSelectClick = () => {
    editor.trigger('assetselect', { type: valueType, callback: onChange });
  };

  return (
    <div className="sg-input-asset">
      <img className="sg-input-asset-icon" src={icon()} />
      <div className="sg-input-asset-label">{value?.label || `None (${ValueTypeNameMap[valueType]})`}</div>
      <div className="sg-input-asset-btn" onClick={onSelectClick} />
    </div>
  );
};
