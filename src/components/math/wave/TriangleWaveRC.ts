import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteTriangleWaveNode = ExtendReteNode<
  'TriangleWave',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class TriangleWaveRC extends RC {
  constructor() {
    super('TriangleWave');
    this.data.component = NodeView;
  }

  initNode(node: ReteTriangleWaveNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/wave';
    meta.label = 'Triangle Wave';
  }

  async builder(node: ReteTriangleWaveNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTriangleWaveNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out');
    const inVar = compiler.getInputVarConverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = 2.0 * abs( 2.0 * (${inVar} - floor(0.5 + ${inVar})) ) - 1.0;`,
    };
  }
}
