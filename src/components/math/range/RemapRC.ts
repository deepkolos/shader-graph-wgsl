import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteRemapNode = ExtendReteNode<
  'Remap',
  {
    inValue: number | number[];
    inValueType: ValueType;
    inMinMaxValue: number[];
    inMinMaxValueType: ValueType.vec2;
    outMinMaxValue: number[];
    outMinMaxValueType: ValueType.vec2;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class RemapRC extends RC {
  constructor() {
    super('Remap');
    this.data.component = NodeView;
  }

  initNode(node: ReteRemapNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('inMinMax', [-1, 1], ValueType.vec2);
    node.initValueType('outMinMax', [0, 1], ValueType.vec2);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/range';
  }

  async builder(node: ReteRemapNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const b = new Rete.Input('inMinMax', 'In Min Max', Sockets.vec2);
    const t = new Rete.Input('outMinMax', 'Out Min Max', Sockets.vec2);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('inMinMax', node));
    t.addControl(new DynamicControl('outMinMax', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRemapNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'remap');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    const minVar = compiler.getInputVarCoverted(node, 'inMinMax');
    const maxVar = compiler.getInputVarCoverted(node, 'outMinMax');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${maxVar}.x + (${inVar} - ${minVar}.x) * (${maxVar}.y - ${minVar}.x) / (${minVar}.y - ${maxVar}.x);`,
    };
  }
}
