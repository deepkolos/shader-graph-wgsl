import './Title.less';
import React, { FC } from 'react';
import { ReteNode } from '../../types';
import { Category } from './Category';

export const Title: FC<{
  node: ReteNode;
}> = ({ node }) => {
  const btnDisabled = [...node.inputs.values(), ...node.outputs.values()].every(io =>
    io.hasConnection(),
  );
  return (
    <div className="sg-title-can">
      <div className="sg-title">{node.label}</div>
      <div
        className="sg-btn-fold"
        data-aria-disabled={btnDisabled}
        data-aria-expanded={node.data.expanded}
        onClick={() => {
          if (!btnDisabled) {
            node.data.expanded = !node.data.expanded;
            node.update();
          }
        }}
      >
        ▾
      </div>
      <Category node={node} />
    </div>
  );
};
