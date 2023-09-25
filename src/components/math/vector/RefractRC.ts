import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteRefractNode = ExtendReteNode<
  'Refract',
  {
    inValue: number | number[];
    inValueType: ValueType;
    normalValue: number | number[];
    normalValueType: ValueType;
    etaValue: number;
    etaValueType: ValueType.float;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class RefractRC extends RC {
  constructor() {
    super('Refract');
    this.data.component = NodeView;
  }

  initNode(node: ReteRefractNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('normal', 0, ValueType.float);
    node.initValueType('eta', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
  }

  async builder(node: ReteRefractNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.dynamicVector).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('normal', 'Normal', Sockets.dynamicVector).addControl(new DynamicControl('normal', node)))
      .addInput(new Rete.Input('eta', 'Ratio Of Indices', Sockets.float).addControl(new DynamicControl('eta', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.dynamicVector));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRefractNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'reflect');
    let inVar = compiler.getInputVarConverted(node, 'in');
    let normalVar = compiler.getInputVarConverted(node, 'normal');
    const etaVar = compiler.getInputVarConverted(node, 'eta');
    const typeClass = compiler.getTypeClass(node.data.outValueType);
    // wgsl refract in normal必须是vec234 不能是float
    if (typeClass === 'f32') {
      return {
        outputs: { out: outVar },
        code: `let ${outVar} = refract(vec2f(${inVar}, 0.0f), vec2f(${normalVar}, 0.0f), ${etaVar}).x;`,
      };
    }
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = refract(${inVar}, ${normalVar}, ${etaVar});`,
    };
  }
}
