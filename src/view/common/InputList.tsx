import './InputList.less';
import React, { FC, useState } from 'react';
import { DefaultProps } from './types';

interface InputListProps extends DefaultProps {
  label: string;
  value: any[];
  Item: any;
  onChange: (v: any[]) => void;
  onAdd: (list: any[]) => any;
  onDel: (item: any) => void;
}
// 注: 数据流是改原值, 非创建新值
export const InputList: FC<InputListProps> = ({ style, label, value, Item, onChange, onAdd, onDel }) => {
  const [selected, setSelected] = useState();

  const onItemChange = () => {
    onChange(value);
  };
  const onBtnAddClick = () => {
    value.push(onAdd(value));
    onChange(value);
  };
  const onBtnDelClick = () => {
    if (!selected) return;
    onDel(selected);
    value.splice(value.indexOf(selected), 1);
    onChange(value);
  };
  return (
    <div className="sg-input-list" style={style}>
      <div className="sg-input-list-label">{label}</div>
      <div className="sg-input-list-body">
        {value.length ? (
          value.map(item => (
            <div key={JSON.stringify(item)} onClick={() => setSelected(item)} style={{ background: selected === item ? '#aeaeae' : '' }}>
              <Item selected={selected === item} value={item} list={value} onChange={onItemChange} />
            </div>
          ))
        ) : (
          <div className="sg-input-list-body-placeholder">List is Empty</div>
        )}
      </div>
      <div className="sg-input-list-btn-can">
        <div className="sg-input-list-btn sg-input-list-btn-add" onClick={onBtnAddClick}>
          +
        </div>
        <div
          className="sg-input-list-btn sg-input-list-btn-del"
          onClick={onBtnDelClick}
          data-aria-disabled={value.length === 0 || !selected}>
          -
        </div>
        <div></div>
      </div>
    </div>
  );
};
