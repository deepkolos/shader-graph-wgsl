import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteInverseLerpNode = ExtendReteNode<
  'InverseLerp',
  {
    aValue: number | number[];
    aValueType: ValueType;
    bValue: number | number[];
    bValueType: ValueType;
    tValue: number | number[];
    tValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class InverseLerpRC extends RC {
  constructor() {
    super('InverseLerp');
    this.data.component = NodeView;
  }

  initNode(node: ReteInverseLerpNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('t', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/interpolation';
  }

  async builder(node: ReteInverseLerpNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const t = new Rete.Input('t', 'T', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    t.addControl(new DynamicControl('t', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteInverseLerpNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'ilerp');
    const aVar = compiler.getInputVarConverted(node, 'a');
    const bVar = compiler.getInputVarConverted(node, 'b');
    const tVar = compiler.getInputVarConverted(node, 't');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = (${tVar} - ${aVar}) / (${bVar} - ${aVar});`,
    };
  }
}
