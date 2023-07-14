import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { NodeView, DynamicControl } from '../../../view';
import { RC } from '../../ReteComponent';

export type ReteNormalReconstructZNode = ExtendReteNode<
  'NormalReconstructZ',
  {
    inValue: number[];
    inValueType: ValueType.vec2;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class NormalReconstructZRC extends RC {
  static Name = 'NormalReconstructZ';
  constructor() {
    super(NormalReconstructZRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalReconstructZNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0], ValueType.vec2);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/normal';
    meta.label = 'Normal Reconstruct Z';
  }

  async builder(node: ReteNormalReconstructZNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec2).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalReconstructZNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'normalRZ');
    const [inVar] = compiler.getInputVarConvertedArray(node, ['in']);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = normalize(vec3f(${inVar}.x, ${inVar}.y, sqrt(1.0 - clamp(dot(${inVar}.xy, ${inVar}.xy), 0., 1.0))));`,
    };
  }
}
