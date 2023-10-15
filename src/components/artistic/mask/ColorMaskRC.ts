import { NodeView, DynamicControl, ColorControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType, ValueUsage } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteColorMaskNode = ExtendReteNode<
  'ColorMask',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    maskColorValue: number;
    maskColorValueType: ValueType.vec3;
    maskColorValueUsage: ValueUsage;
    rangeValue: number;
    rangeValueType: ValueType.float;
    fuzzinessValue: number;
    fuzzinessValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class ColorMaskRC extends RC {
  static Name = 'ColorMask';
  constructor() {
    super(ColorMaskRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteColorMaskNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('maskColor', [0, 0, 0], ValueType.vec3, undefined, ValueUsage.Color);
    node.initValueType('range', 0, ValueType.float);
    node.initValueType('fuzziness', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/mask';
    meta.label = 'Color Mask';
  }

  async builder(node: ReteColorMaskNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(
        new Rete.Input('maskColor', 'Mask Color', Sockets.vec3).addControl(
          new ColorControl('maskColor', node),
        ),
      )
      .addInput(
        new Rete.Input('range', 'Range', Sockets.float).addControl(
          new DynamicControl('range', node),
        ),
      )
      .addInput(
        new Rete.Input('fuzziness', 'Fuzziness', Sockets.float).addControl(
          new DynamicControl('fuzziness', node),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteColorMaskNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'contrast');
    const [inVar, maskColorVar, rangeVar, fuzzinessVar] = compiler.getInputVarConvertedArray(node, [
      'in',
      'maskColor',
      'range',
      'fuzziness',
    ]);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = clamp(1.0 - (distance(${maskColorVar}, ${inVar}) - ${rangeVar}) / max(${fuzzinessVar}, 1e-5), 0.0, 1.0);`,
    };
  }
}
