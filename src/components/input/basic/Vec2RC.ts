import { NodeView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteVec2Node = ExtendReteNode<
  'Vector 2',
  {
    xValue: number;
    xValueType: ValueType.float;
    yValue: number;
    yValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec2;
  }
>;

export class Vec2RC extends RC {
  constructor() {
    super('Vector 2');
    this.data.component = NodeView;
  }

  initNode(node: ReteVec2Node) {
    const { data, meta } = node;
    node.initValueType('x', 0, ValueType.float);
    node.initValueType('y', 0, ValueType.float);
    node.initValueType('out', [0, 0], ValueType.vec2);
    data.expanded ??= true;
    meta.previewDisabled = true;
    meta.category = 'input/basic';
  }

  async builder(node: ReteVec2Node) {
    this.initNode(node);
    const x = new Rete.Input('x', 'X', Sockets.float);
    const y = new Rete.Input('y', 'Y', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.vec2);

    x.addControl(new FloatControl('x', node));
    y.addControl(new FloatControl('y', node));

    node.addOutput(out).addInput(x).addInput(y);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVec2Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'v2');
    const xVar = compiler.getInputVarCoverted(node, 'x');
    const yVar = compiler.getInputVarCoverted(node, 'y');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${compiler.compileValue([xVar, yVar], node.data.outValueType)};`,
    };
  }
}
