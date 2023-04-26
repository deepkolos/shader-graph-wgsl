import './Context.less';
import React, { FC } from 'react';
import { Rete, ReteContextNode } from '../types';
import { ContextIO } from './common';

interface ContextViewProps {
  node: ReteContextNode;
  editor: Rete.NodeEditor;
  bindSocket: Function;
  bindControl: Function;
  bindBlock: Function;
}

export const ContextView: FC<ContextViewProps> = ({ node, bindBlock, editor, bindSocket }) => {
  const selected = editor.selected.contains(node);
  return (
    <div className="sg-context" data-aria-selected={selected}>
      <div className="sg-context-title">{node.label}</div>
      <div className="sg-context-block-can">
        {node.blocks.length ? (
          node.blocks.map(block => {
            return <div className="sg-context-block" key={block.id} ref={el => el && bindBlock(el, block)} />;
          })
        ) : (
          <div className="sg-context-block-placeholder">右键添加节点</div>
        )}
      </div>
      <ContextIO node={node} bindSocket={bindSocket} />
    </div>
  );
};
