import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { NodeView, DynamicControl } from '../../../view';
import { RC } from '../../ReteComponent';

export type ReteNormalStrengthNode = ExtendReteNode<
  'NormalStrength',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    strengthValue: number;
    strengthValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class NormalStrengthRC extends RC {
  static Name = 'NormalStrength';
  constructor() {
    super(NormalStrengthRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalStrengthNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 1], ValueType.vec3);
    node.initValueType('strength', 1, ValueType.float);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/normal';
    meta.label = 'Normal Strength';
  }

  async builder(node: ReteNormalStrengthNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('strength', 'Strength', Sockets.vec3).addControl(new DynamicControl('strength', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalStrengthNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'normalRZ');
    const [inVar, strengthVar] = compiler.getInputVarConvertedArray(node, ['in', 'strength']);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = vec3f(${inVar}.rg * ${strengthVar}, mix(1.0, ${inVar}.b, clamp(${strengthVar}, 0., 1.0)));`,
    };
  }
}
