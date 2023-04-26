import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../../types';
import { NodeView, SelectControl, FloatControl } from '../../../view';
import { UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteGradientNoiseNode = ExtendReteNode<
  'GradientNoise',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    scaleValue: number;
    scaleValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class GradientNoiseRC extends RC {
  constructor() {
    super('GradientNoise');
    this.data.component = NodeView;
  }

  initNode(node: ReteGradientNoiseNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('scale', 10, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural/noise';
  }

  async builder(node: ReteGradientNoiseNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('scale', 'Scale', Sockets.float).addControl(new FloatControl('scale', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteGradientNoiseNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'gradient_noise');
    const scaleVar = compiler.getInputVarCoverted(node, 'scale');
    let uvVar = compiler.getInputVarCoverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}_dir(p_: vec2<f32>) -> vec2<f32> {
  let p = (p_ % 289.);
  var x = (34. * p.x + 1.) * (p.x % 289.) + p.y;
  x = (34. * x + 1.) * (x % 289.);
  x = fract(x / 41.) * 2. - 1.;
  return normalize(vec2<f32>(x - floor(x + 0.5), abs(x) - 0.5));
}
fn ${varName}(p: vec2<f32>) -> f32 {
  let ip = floor(p);
  var fp = fract(p);
  let d00 = dot(${varName}_dir(ip), fp);
  let d01 = dot(${varName}_dir(ip + vec2<f32>(0, 1)), fp - vec2<f32>(0, 1));
  let d10 = dot(${varName}_dir(ip + vec2<f32>(1, 0)), fp - vec2<f32>(1, 0));
  let d11 = dot(${varName}_dir(ip + vec2<f32>(1, 1)), fp - vec2<f32>(1, 1));
  fp = fp * fp * fp * (fp * (fp * 6. - 15.) + 10.);
  return mix(mix(d00, d01, fp.y), mix(d10, d11, fp.y), fp.x);
}`;
    const fnVar = compiler.setContext('defineFns', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar} * ${scaleVar});`,
    };
  }
}
