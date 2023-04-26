import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType, VectorValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteDistanceNode = ExtendReteNode<
  'Distance',
  {
    aValue: number | number[];
    aValueType: VectorValueType;
    bValue: number | number[];
    bValueType: VectorValueType;
    outValue: number[];
    outValueType: ValueType.float;
  }
>;

export class DistanceRC extends RC {
  constructor() {
    super('Distance');
    this.data.component = NodeView;
  }

  initNode(node: ReteDistanceNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
  }

  async builder(node: ReteDistanceNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.float);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteDistanceNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'distance');
    const aVar = compiler.getInputVarCoverted(node, 'a');
    const bVar = compiler.getInputVarCoverted(node, 'b');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = distance(${aVar}, ${bVar});`,
    };
  }
}
