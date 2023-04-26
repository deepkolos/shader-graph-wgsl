import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteNoiseSineWaveNode = ExtendReteNode<
  'NoiseSineWave',
  {
    inValue: number | number[];
    inValueType: ValueType;
    minMaxValue: number[];
    minMaxValueType: ValueType.vec2;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class NoiseSineWaveRC extends RC {
  constructor() {
    super('NoiseSineWave');
    this.data.component = NodeView;
  }

  initNode(node: ReteNoiseSineWaveNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('minMax', [-0.5, 0.5], ValueType.vec2);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/wave';
    meta.label = 'Noise Sine Wave';
  }

  async builder(node: ReteNoiseSineWaveNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const b = new Rete.Input('minMax', 'Min Max', Sockets.vec2);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('minMax', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNoiseSineWaveNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    const minMaxVar = compiler.getInputVarCoverted(node, 'minMax');
    const typeClass = compiler.getTypeClass(node.data.outValueType);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(in_: ${typeClass}, minMax: vec2<f32>) -> ${typeClass} {
  let sinIn = sin(in_);
  let sinInOffset = sin(in_ + 1.0);
  let randomno = fract(sin((sinIn - sinInOffset) * (12.9898 + 78.233)) * 43758.5453);
  let noise = mix(minMax.x, minMax.y, randomno);
  return sinIn + noise;
}`;
    const fnVarName = compiler.setContext('defines', node, node.data.outValueType, codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVarName}(${inVar}, ${minMaxVar});`,
    };
  }
}
