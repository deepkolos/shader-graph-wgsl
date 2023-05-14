import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteClampNode = ExtendReteNode<
  'Clamp',
  {
    inValue: number | number[];
    inValueType: ValueType;
    minValue: number | number[];
    minValueType: ValueType;
    maxValue: number | number[];
    maxValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class ClampRC extends RC {
  constructor() {
    super('Clamp');
    this.data.component = NodeView;
  }

  initNode(node: ReteClampNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('min', 0, ValueType.float);
    node.initValueType('max', 1, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/range';
  }

  async builder(node: ReteClampNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const b = new Rete.Input('min', 'Min', Sockets.dynamicVector);
    const t = new Rete.Input('max', 'Max', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('min', node));
    t.addControl(new DynamicControl('max', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteClampNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'clamp');
    const inVar = compiler.getInputVarConverted(node, 'in');
    const minVar = compiler.getInputVarConverted(node, 'min');
    const maxVar = compiler.getInputVarConverted(node, 'max');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = clamp(${inVar}, ${minVar}, ${maxVar});`,
    };
  }
}
