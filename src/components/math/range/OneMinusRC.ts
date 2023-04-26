import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteOneMinusNode = ExtendReteNode<
  'OneMinus',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class OneMinusRC extends RC {
  constructor() {
    super('OneMinus');
    this.data.component = NodeView;
  }

  initNode(node: ReteOneMinusNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/range';
  }

  async builder(node: ReteOneMinusNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteOneMinusNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'one_minus');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = 1.0 - ${inVar};`,
    };
  }
}
