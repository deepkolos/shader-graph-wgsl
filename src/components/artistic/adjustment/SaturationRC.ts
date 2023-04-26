import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSaturationNode = ExtendReteNode<
  'Saturation',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    saturationValue: number;
    saturationValueType: ValueType.float;
  }
>;

export class SaturationRC extends RC {
  static Name = 'Saturation';
  constructor() {
    super(SaturationRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteSaturationNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('saturation', 1, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/adjustment';
  }

  async builder(node: ReteSaturationNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('saturation', 'Saturation', Sockets.vec3).addControl(new DynamicControl('saturation', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSaturationNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'saturation');
    const [saturationVar, inVar] = compiler.getInputVarCovertedArray(node, ['saturation', 'in']);
    return {
      outputs: { out: outVar },
      code: `let ${outVar}_luma = dot(${inVar}, vec3<f32>(0.2126729, 0.7151522, 0.0721750));
  let ${outVar} = ${outVar}_luma + ${saturationVar} * (${inVar} - ${outVar}_luma);`,
    };
  }
}
