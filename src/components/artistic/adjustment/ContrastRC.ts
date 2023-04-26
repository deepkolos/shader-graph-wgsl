import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteContrastNode = ExtendReteNode<
  'Contrast',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    contrastValue: number;
    contrastValueType: ValueType.float;
  }
>;

export class ContrastRC extends RC {
  static Name = 'Contrast';
  constructor() {
    super(ContrastRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteContrastNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('contrast', 1, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/adjustment';
  }

  async builder(node: ReteContrastNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('contrast', 'Contrast', Sockets.vec3).addControl(new DynamicControl('contrast', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteContrastNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'contrast');
    const [contrastVar, inVar] = compiler.getInputVarCovertedArray(node, ['contrast', 'in']);
    // pow(0.5, 2.2) = 0.217637640824031
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = (${inVar} - 0.217637640824031) * ${contrastVar} + 0.217637640824031;`,
    };
  }
}
