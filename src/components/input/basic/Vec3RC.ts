import { NodeView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteVec3Node = ExtendReteNode<
  'Vector 3',
  {
    xValue: number;
    xValueType: ValueType.float;
    yValue: number;
    yValueType: ValueType.float;
    zValue: number;
    zValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;
export class Vec3RC extends RC {
  constructor() {
    super('Vector 3');
    this.data.component = NodeView;
  }

  initNode(node: ReteVec3Node) {
    const { data, meta } = node;
    node.initValueType('x', 0, ValueType.float);
    node.initValueType('y', 0, ValueType.float);
    node.initValueType('z', 0, ValueType.float);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.previewDisabled = true;
    meta.category = 'input/basic';
    meta.keywords = ['vec3'];
  }

  async builder(node: ReteVec3Node) {
    this.initNode(node);
    const x = new Rete.Input('x', 'X', Sockets.float);
    const y = new Rete.Input('y', 'Y', Sockets.float);
    const z = new Rete.Input('z', 'Z', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    x.addControl(new FloatControl('x', node));
    y.addControl(new FloatControl('y', node));
    z.addControl(new FloatControl('z', node));
    node.addOutput(out).addInput(x).addInput(y).addInput(z);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVec3Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'v3');
    const xVar = compiler.getInputVarConverted(node, 'x');
    const yVar = compiler.getInputVarConverted(node, 'y');
    const zVar = compiler.getInputVarConverted(node, 'z');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${compiler.compileValue([xVar, yVar, zVar], node.data.outValueType)};`,
    };
  }
}
