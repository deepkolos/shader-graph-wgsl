import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSquareWaveNode = ExtendReteNode<
  'SquareWave',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class SquareWaveRC extends RC {
  constructor() {
    super('SquareWave');
    this.data.component = NodeView;
  }

  initNode(node: ReteSquareWaveNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/wave';
    meta.label = 'Square Wave';
  }

  async builder(node: ReteSquareWaveNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSquareWaveNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out');
    const inVar = compiler.getInputVarConverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = 1.0 - 2.0 * round(fract(${inVar}));`,
    };
  }
}
