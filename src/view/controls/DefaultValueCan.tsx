import './DefaultValueCan.less';
import React, { FC } from 'react';
import { Socket } from '../common/Socket';
import { ReteNode, ValueTypeColorMap } from '../../types';
import { stopPropagation } from '../utils';

export const DefaultValueCan: FC<{
  dataKey: string;
  node: ReteNode;
  children?: any;
  asEmptyWrapper?: boolean;
}> = ({ dataKey, node, children, asEmptyWrapper }) => {
  return !asEmptyWrapper ? (
    <div className="sg-default-value-can" onPointerDown={stopPropagation as any}>
      {children}
      <div
        className="sg-default-value-line"
        // @ts-ignore
        style={{ backgroundColor: ValueTypeColorMap[node.getValueType(dataKey)] }}
      />
      <Socket type="default" valueType={node.getValueType(dataKey)} />
    </div>
  ) : (
    children
  );
};
