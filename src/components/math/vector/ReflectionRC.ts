import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteReflectionNode = ExtendReteNode<
  'Reflection',
  {
    inValue: number | number[];
    inValueType: ValueType;
    normalValue: number | number[];
    normalValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class ReflectionRC extends RC {
  constructor() {
    super('Reflection');
    this.data.component = NodeView;
  }

  initNode(node: ReteReflectionNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('normal', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
  }

  async builder(node: ReteReflectionNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const b = new Rete.Input('normal', 'Normal', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('normal', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteReflectionNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'reflect');
    const inVar = compiler.getInputVarConverted(node, 'in');
    const normalVar = compiler.getInputVarConverted(node, 'normal');
    if (node.data.inValueType === ValueType.float) {
      return {
        outputs: { out: outVar },
        code: `let ${outVar} = ${inVar} - 2.0 * (${normalVar} * ${inVar}) * ${normalVar};`,
      };
    }
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = reflect(${inVar}, ${normalVar});`,
    };
  }
}
