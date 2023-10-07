import React, { FC, ReactNode } from 'react';
import { Rete, ValueTypeColorMap } from '../../types';
import './Socket.less';

export const Socket: FC<{
  innerRef?: Function;
  type: 'input' | 'output' | 'default';
  valueType: string;
  io?: Rete.Input | Rete.Output;
  socket?: Rete.Socket;
  disabled?: boolean;
  vertical?: boolean;
  children?: ReactNode;
}> = ({ type, innerRef, io, valueType, children, vertical }) => {
  // @ts-ignore
  const color = ValueTypeColorMap[valueType] || 'red';
  return (
    <div className="sg-socket-can" ref={el => el && innerRef && innerRef(el, type, io)} data-type={type} data-vertical={vertical}>
      <div
        className="sg-socket"
        data-connected={io?.hasConnection()}
        data-value-type={valueType}
        data-type={type}
        style={{ borderColor: color }}
      >
        <div className="sg-socket-inner" style={{ backgroundColor: color }} />
        {children}
      </div>
    </div>
  );
};
