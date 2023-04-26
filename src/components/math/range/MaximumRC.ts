import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteMaximumNode = ExtendReteNode<
  'Maximum',
  {
    aValue: number | number[];
    aValueType: ValueType;
    bValue: number | number[];
    bValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class MaximumRC extends RC {
  constructor() {
    super('Maximum');
    this.data.component = NodeView;
  }

  initNode(node: ReteMaximumNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/range';
  }

  async builder(node: ReteMaximumNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteMaximumNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'max');
    const aVar = compiler.getInputVarCoverted(node, 'a');
    const bVar = compiler.getInputVarCoverted(node, 'b');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = max(${aVar}, ${bVar});`,
    };
  }
}
