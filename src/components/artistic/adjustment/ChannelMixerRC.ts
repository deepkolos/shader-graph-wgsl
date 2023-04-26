import { NodeView, DynamicControl, ChannelMixerControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteChannelMixerNode = ExtendReteNode<
  'ChannelMixer',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    rValue: number[];
    rValueType: ValueType.vec3;
    gValue: number[];
    gValueType: ValueType.vec3;
    bValue: number[];
    bValueType: ValueType.vec3;
  }
>;

export class ChannelMixerRC extends RC {
  constructor() {
    super('ChannelMixer');
    this.data.component = NodeView;
  }

  initNode(node: ReteChannelMixerNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('r', [0, 0, 0], ValueType.vec3);
    node.initValueType('g', [0, 0, 0], ValueType.vec3);
    node.initValueType('b', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/adjustment';
    meta.label = 'Channel Mixer';
  }

  async builder(node: ReteChannelMixerNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.vec3);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a).addControl(new ChannelMixerControl('r', 'g', 'b', node));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteChannelMixerNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'channelMixer');
    const [rVar, gVar, bVar, inVar] = compiler.getInputVarCovertedArray(node, ['r', 'g', 'b', 'in']);
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = vec3<f32>(dot(${inVar}, ${rVar}), dot(${inVar}, ${gVar}), dot(${inVar}, ${bVar}));`,
    };
  }
}
