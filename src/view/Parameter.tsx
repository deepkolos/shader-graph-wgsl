import './Parameter.less';
import React, { FC } from 'react';
import { NodeViewProps } from './Node';
import { IO } from './common';

export const ParameterView: FC<NodeViewProps> = ({ node, editor, bindSocket, bindControl }) => (
  <div className="sg-parameter">
    <div className="sg-parameter-item-exposed" style={{ display: node.data.exposed ? 'block' : 'none' }} />
    <IO
      inputs={[...node.inputs.values()]}
      outputs={[...node.outputs.values()]}
      node={node}
      bindSocket={bindSocket}
      bindControl={bindControl}
      gapTop={false}
      gapBottom={false}
      outputCanClass="sg-parameter-output-can"
      outputClass="sg-parameter-output"
    />
  </div>
);
