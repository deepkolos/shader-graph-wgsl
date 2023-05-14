import { NodeView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteVec4Node = ExtendReteNode<
  'Vector 4',
  {
    xValue: number;
    xValueType: ValueType.float;
    yValue: number;
    yValueType: ValueType.float;
    zValue: number;
    zValueType: ValueType.float;
    wValue: number;
    wValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec4;
    [k: string]: any;
  }
>;

export class Vec4RC extends RC {
  constructor() {
    super('Vector 4');
    this.data.component = NodeView;
  }

  initNode(node: ReteVec4Node) {
    const { data, meta } = node;
    node.initValueType('x', 0, ValueType.float);
    node.initValueType('y', 0, ValueType.float);
    node.initValueType('z', 0, ValueType.float);
    node.initValueType('w', 0, ValueType.float);
    node.initValueType('out', [0, 0, 0, 0], ValueType.vec4);
    data.expanded ??= true;

    meta.previewDisabled = true;
    meta.category = 'input/basic';
  }

  async builder(node: ReteVec4Node) {
    this.initNode(node);
    const x = new Rete.Input('x', 'X', Sockets.float);
    const y = new Rete.Input('y', 'Y', Sockets.float);
    const z = new Rete.Input('z', 'Z', Sockets.float);
    const w = new Rete.Input('w', 'W', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.vec4);

    x.addControl(new FloatControl('x', node));
    y.addControl(new FloatControl('y', node));
    z.addControl(new FloatControl('z', node));
    w.addControl(new FloatControl('w', node));

    node.addOutput(out).addInput(x).addInput(y).addInput(z).addInput(w);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVec4Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'v4');
    const xVar = compiler.getInputVarConverted(node, 'x');
    const yVar = compiler.getInputVarConverted(node, 'y');
    const zVar = compiler.getInputVarConverted(node, 'z');
    const wVar = compiler.getInputVarConverted(node, 'w');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${compiler.compileValue([xVar, yVar, zVar, wVar], node.data.outValueType)};`,
    };
  }
}
