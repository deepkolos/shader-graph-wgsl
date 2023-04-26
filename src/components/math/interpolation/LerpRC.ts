import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteLerpNode = ExtendReteNode<
  'Lerp',
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

export class LerpRC extends RC {
  constructor() {
    super('Lerp');
    this.data.component = NodeView;
  }

  initNode(node: ReteLerpNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('t', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/interpolation';
  }

  async builder(node: ReteLerpNode) {
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

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteLerpNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'lerp');
    const aVar = compiler.getInputVarCoverted(node, 'a');
    const bVar = compiler.getInputVarCoverted(node, 'b');
    const tVar = compiler.getInputVarCoverted(node, 't');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = mix(${aVar}, ${bVar}, ${tVar});`,
    };
  }
}
