import { DynamicControl, InputControl, NodeView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ExtendReteNode, VectorValueType } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

export type ReteSwizzleNode = ExtendReteNode<
  'Swizzle',
  {
    inValue: number | number[];
    inValueType: VectorValueType;
    outValue: number | number[];
    outValueType: VectorValueType;
    swizzleValue: string;
  }
>;

export class SwizzleRC extends RC {
  constructor() {
    super('Swizzle');
    this.data.component = NodeView;
  }

  initNode(node: ReteSwizzleNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('swizzle', 'xyzw', ValueType.string);
    data.expanded ??= true;

    meta.category = 'channel';
    meta.previewDisabled = true;
  }

  async builder(node: ReteSwizzleNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('in', 'In', Sockets.dynamicVector).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.dynamicVector))
      .addControl(new InputControl('swizzle', node, 'Mask', v => !!v.match(/[xyzwrgba]{4}/) && v.length === 4, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSwizzleNode>): SGNodeOutput {
    const inVar = compiler.getInputVar(node, 'in');

    let code = '';
    let outVar = '';
    if (node.outputs.out.connections.length) {
      const varSwizzle = compiler.getVarSwizzle(inVar, node.data.inValueType, node.data.swizzleValue);
      const typeClass = compiler.getTypeClass(node.data.outValueType);
      outVar = compiler.getOutVarName(node, 'out', 'swizzle');
      code = `let ${outVar}: ${typeClass} = ${varSwizzle};`;
    }

    return { code, outputs: { out: outVar } };
  }
}
