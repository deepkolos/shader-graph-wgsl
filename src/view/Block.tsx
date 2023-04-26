import './Block.less';
import React, { FC } from 'react';
import { Rete, ReteContextNode } from '../types';
import { IO } from './common';

interface BlockViewProps {
  node: ReteContextNode;
  editor: Rete.NodeEditor;
  bindSocket: Function;
  bindControl: Function;
}

export const BlockView: FC<BlockViewProps> = ({ node, bindSocket, bindControl }) => {
  return (
    <div className="sg-block">
      <IO
        inputs={[...node.inputs.values()]}
        outputs={[...node.outputs.values()]}
        node={node}
        bindSocket={bindSocket}
        bindControl={bindControl}
        gapTop={false}
        gapBottom={false}
      />
    </div>
  );
};
