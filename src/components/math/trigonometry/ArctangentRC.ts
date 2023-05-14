import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteArctangentNode = ExtendReteNode<
  'Arctangent',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class ArctangentRC extends RC {
  constructor() {
    super('Arctangent');
    this.data.component = NodeView;
  }

  initNode(node: ReteArctangentNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/trigonometry';
  }

  async builder(node: ReteArctangentNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteArctangentNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'atan');
    const inVar = compiler.getInputVarConverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = atan(${inVar});`,
    };
  }
}
