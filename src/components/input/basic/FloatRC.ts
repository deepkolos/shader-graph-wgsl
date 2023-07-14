import { NodeView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteFloatNode = ExtendReteNode<
  'Float',
  {
    xValue: number;
    xValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class FloatRC extends RC {
  constructor() {
    super('Float');
    this.data.component = NodeView;
  }

  initNode(node: ReteFloatNode) {
    const { data, meta } = node;
    node.initValueType('x', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.category = 'input/basic';
    meta.previewDisabled = true;
    meta.keywords = ['vector', 'f32'];
  }

  async builder(node: ReteFloatNode) {
    this.initNode(node);

    const x = new Rete.Input('x', 'X', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.float);
    x.addControl(new FloatControl('x', node));
    node.addOutput(out).addInput(x);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteFloatNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'f');
    const inVar = compiler.getInputVarConverted(node, 'x');
    return {
      outputs: { out: outVar },
      code: `let ${outVar}: f32 = ${inVar};`,
    };
  }
}
