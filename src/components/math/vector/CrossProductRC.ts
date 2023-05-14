import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteCrossProductNode = ExtendReteNode<
  'CrossProduct',
  {
    aValue: number[];
    aValueType: ValueType.vec3;
    bValue: number[];
    bValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class CrossProductRC extends RC {
  constructor() {
    super('CrossProduct');
    this.data.component = NodeView;
  }

  initNode(node: ReteCrossProductNode) {
    const { data, meta } = node;
    node.initValueType('a', [0, 0, 0], ValueType.vec3);
    node.initValueType('b', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
    meta.label = 'Cross Product';
  }

  async builder(node: ReteCrossProductNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.vec3);
    const b = new Rete.Input('b', 'B', Sockets.vec3);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCrossProductNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'cross');
    const aVar = compiler.getInputVarConverted(node, 'a');
    const bVar = compiler.getInputVarConverted(node, 'b');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = cross(${aVar}, ${bVar});`,
    };
  }
}
