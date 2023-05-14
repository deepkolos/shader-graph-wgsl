import { NodeView, DynamicControl, ColorControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteReplaceColorNode = ExtendReteNode<
  'ReplaceColor',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    rangeValue: number;
    rangeValueType: ValueType.float;
    fuzzinessValue: number;
    fuzzinessValueType: ValueType.float;
    fromValue: number[];
    fromValueType: ValueType.vec3;
    toValue: number[];
    toValueType: ValueType.vec3;
  }
>;

export class ReplaceColorRC extends RC {
  static Name = 'ReplaceColor';
  constructor() {
    super(ReplaceColorRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteReplaceColorNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('range', 0, ValueType.float);
    node.initValueType('fuzziness', 0, ValueType.float);
    node.initValueType('from', [0, 0, 0], ValueType.vec3);
    node.initValueType('to', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/adjustment';
    meta.label = 'Replace Color';
  }

  async builder(node: ReteReplaceColorNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('from', 'From', Sockets.vec3).addControl(new ColorControl('from', node)))
      .addInput(new Rete.Input('to', 'To', Sockets.vec3).addControl(new ColorControl('to', node)))
      .addInput(new Rete.Input('range', 'Range', Sockets.vec3).addControl(new DynamicControl('range', node)))
      .addInput(new Rete.Input('fuzziness', 'Fuzziness', Sockets.vec3).addControl(new DynamicControl('fuzziness', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteReplaceColorNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'replaceColor');
    const [fuzzVar, toVar, fromVar, rangeVar, inVar] = compiler.getInputVarConvertedArray(node, ['fuzziness', 'to', 'from', 'range', 'in']);
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = mix(${toVar}, ${inVar}, clamp((distance(${fromVar}, ${inVar}) - ${rangeVar}) / max(${fuzzVar}, 1e-5f), 0., 1.));`,
    };
  }
}
