import './Settings.less';
import React, { FC, useState } from 'react';
import { Rete, ReteNode, ValueType } from '../../types';
import { InputAsset, InputList, Select } from '.';
import { capitalizeFirstLetter } from '../../utils';
import { stopPropagation } from '../utils';

type Setting = { [k: string]: any };

export type SettingValueCfgs = {
  [k: string]: {
    options?: string[];
    list?: ListItem;
    labelWidth?: string;
    constant?: boolean;
    textarea?: boolean;
    asset?: { type: ValueType };
    excludes?: { [value: string]: string[] };
  };
};

type ListItem = {
  onAdd(list: any[]): any;
  onDel(item: any): void;
  onChange?(node: ReteNode, value: any, editor: Rete.NodeEditor): void;
  Item: any;
};
interface SettingProps {
  setting?: Setting;
  items?: string[];
  onChange: (name: string, value: any) => void;
  valueCfgs: SettingValueCfgs;
  editor: Rete.NodeEditor;
}

export const Settings: FC<SettingProps> = ({ setting = {}, items = Object.keys(setting), onChange, valueCfgs = {}, editor }) => {
  const [i, rerender] = useState(0);
  const update = () => rerender(i + 1);
  const excludes: string[] = [];

  items.forEach(i => {
    const value = setting[i];
    const cfg = valueCfgs[i];
    if (cfg?.options && cfg.excludes?.[value]) {
      excludes.push(...cfg.excludes[value]!);
    }
  });

  return (
    <>
      {items
        .filter(i => !excludes.includes(i))
        .map(name => {
          const value = setting[name];
          const valueCfg = valueCfgs[name] || {};
          const label = capitalizeFirstLetter(name.replace(/[A-Z]/g, $0 => ' ' + $0));
          const isConstant = Boolean(valueCfg.constant);
          const isAsset = valueCfg.asset !== undefined;
          const isList = valueCfg.list !== undefined && Array.isArray(value);
          const isSelect = valueCfg.options !== undefined;
          const isBoolean = !isConstant && !isSelect && typeof value === 'boolean';
          const isString = !isConstant && !isSelect && typeof value === 'string';
          return (
            <div className="sg-inspector-setting" key={name}>
              {!isList && label && (
                <div className="sg-inspector-setting-label" style={{ width: valueCfg.labelWidth }}>
                  {label}
                </div>
              )}
              <div className="sg-inspector-setting-body" onPointerDownCapture={stopPropagation}>
                {isConstant && value}
                {isSelect && (
                  <Select
                    className="sg-inspector-setting-select"
                    value={value}
                    options={valueCfg.options!}
                    onChange={v => onChange(name, v)}
                  />
                )}
                {/* @ts-ignore */}
                {isBoolean && <input checked={value} type="checkbox" onChange={() => onChange(name, !value)} />}
                {isString &&
                  (valueCfg.textarea ? (
                    // @ts-ignore
                    <textarea value={value} onChange={e => onChange(name, e.target.value)} style={{ width: '120px' }} />
                  ) : (
                    // @ts-ignore
                    <input value={value} onChange={e => onChange(name, e.target.value)} style={{ width: '80px' }} />
                  ))}
                {isList && (
                  <InputList
                    style={{ margin: '5px 0' }}
                    label={label}
                    value={value}
                    onChange={v => {
                      onChange(name, v);
                      update();
                    }}
                    Item={valueCfg!.list!.Item}
                    onAdd={valueCfg!.list!.onAdd}
                    onDel={valueCfg!.list!.onDel}
                  />
                )}
                {isAsset && (
                  <InputAsset
                    editor={editor}
                    value={value}
                    valueType={valueCfg.asset!.type}
                    onChange={v => {
                      onChange(name, v);
                      update();
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
    </>
  );
};
