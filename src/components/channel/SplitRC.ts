import { DynamicControl, NodeView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ExtendReteNode, VectorValueType } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

export type ReteSplitNode = ExtendReteNode<
  'Split',
  {
    inValue: number | number[];
    inValueType: VectorValueType;
    rValue: number;
    rValueType: ValueType.float;
    gValue: number;
    gValueType: ValueType.float;
    bValue: number;
    bValueType: ValueType.float;
    aValue: number;
    aValueType: ValueType.float;
  }
>;

export class SplitRC extends RC {
  constructor() {
    super('Split');
    this.data.component = NodeView;
  }

  initNode(node: ReteSplitNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('r', 0, ValueType.float);
    node.initValueType('g', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('a', 0, ValueType.float);
    data.expanded ??= true;

    meta.category = 'channel';
    meta.previewDisabled = true;
  }

  async builder(node: ReteSplitNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('in', 'In', Sockets.dynamicVector).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('r', 'R', Sockets.float))
      .addOutput(new Rete.Output('g', 'G', Sockets.float))
      .addOutput(new Rete.Output('b', 'B', Sockets.float))
      .addOutput(new Rete.Output('a', 'A', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSplitNode>): SGNodeOutput {
    const inVar = compiler.getInputVar(node, 'in');
    const outputs = { r: '', g: '', b: '', a: '' };

    (Object.keys(outputs) as any as Array<keyof typeof outputs>).forEach(key => {
      if (node.outputs[key].connections.length === 0) return;
      outputs[key] = compiler.getVarChannel(inVar, node.data.inValueType, key);
    });

    return { code: '', outputs };
  }
}
