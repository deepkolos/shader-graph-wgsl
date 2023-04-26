import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteNormalizeNode = ExtendReteNode<
  'Normalize',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class NormalizeRC extends RC {
  constructor() {
    super('Normalize');
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalizeNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/advanced';
  }

  async builder(node: ReteNormalizeNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalizeNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'norm');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    if (node.data.inValueType === ValueType.float) {
      return { outputs: { out: inVar }, code: '' };
    }
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = normalize(${inVar});`,
    };
  }
}
