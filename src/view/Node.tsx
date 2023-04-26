import './Node.less';
import React from 'react';
import { Title, IO, Preview } from './common';
import { ReteNode, Rete } from '../types';
import { Control } from './controls';
import { NodeView as ReteNodeView } from '../rete/view/node';

export interface NodeViewProps {
  node: ReteNode;
  view: ReteNodeView;
  editor: Rete.NodeEditor;
  bindSocket: Function;
  bindControl: Function;
}

export class NodeView extends React.Component<NodeViewProps> {
  state: ReturnType<typeof NodeView.getDerivedStateFromProps> = {} as any;

  static getDerivedStateFromProps({ node, editor }: NodeViewProps) {
    return {
      outputs: Array.from(node.outputs.values()),
      controls: Array.from(node.controls.values()),
      inputs: Array.from(node.inputs.values()),
      selected: editor.selected.contains(node) ? 'selected' : '',
    };
  }

  render() {
    const { node, bindSocket, bindControl, view } = this.props;
    const { outputs, controls, inputs, selected } = this.state;

    return (
      <div className={`sg-node ${selected}`}>
        <Title node={node} />
        <IO inputs={inputs} outputs={outputs} node={node} bindSocket={bindSocket} bindControl={bindControl} />

        {/* Controls */}
        <div className="sg-node-control-can">
          {controls.map(control => (
            <Control className="control" key={control.key} control={control} innerRef={bindControl} />
          ))}
        </div>

        {!node.meta.previewDisabled && <Preview node={node} view={view} />}
      </div>
    );
  }
}
