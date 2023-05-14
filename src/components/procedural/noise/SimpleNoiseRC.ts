import { ShaderGraphCompiler, SGNodeOutput, initRandContext } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../../types';
import { NodeView, SelectControl, FloatControl } from '../../../view';
import { UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteSimpleNoiseNode = ExtendReteNode<
  'SimpleNoise',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    scaleValue: number;
    scaleValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class SimpleNoiseRC extends RC {
  constructor() {
    super('SimpleNoise');
    this.data.component = NodeView;
  }

  initNode(node: ReteSimpleNoiseNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('scale', 500, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural/noise';
  }

  async builder(node: ReteSimpleNoiseNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('scale', 'Scale', Sockets.float).addControl(new FloatControl('scale', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSimpleNoiseNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'simple_noise');
    const scaleVar = compiler.getInputVarConverted(node, 'scale');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const randFn = initRandContext(compiler);
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}_interpolate (a: f32, b: f32, t: f32) -> f32 {
  return (1.0-t)*a + (t*b);
}
fn ${varName}_valueNoise (uv_: vec2<f32>) -> f32 {
  let i = floor(uv_);
  var f = fract(uv_);
  f = f * f * (3.0 - 2.0 * f);

  let uv = abs(fract(uv_) - 0.5);
  let c0 = i + vec2<f32>(0.0, 0.0);
  let c1 = i + vec2<f32>(1.0, 0.0);
  let c2 = i + vec2<f32>(0.0, 1.0);
  let c3 = i + vec2<f32>(1.0, 1.0);
  let r0 = ${randFn}(c0);
  let r1 = ${randFn}(c1);
  let r2 = ${randFn}(c2);
  let r3 = ${randFn}(c3);

  let bottomOfGrid = ${varName}_interpolate(r0, r1, f.x);
  let topOfGrid = ${varName}_interpolate(r2, r3, f.x);
  let t = ${varName}_interpolate(bottomOfGrid, topOfGrid, f.y);
  return t;
}
fn ${varName}(UV: vec2<f32>, Scale: f32) -> f32 {
  var t = 0.0;

  var freq = pow(2.0, 0.0);
  var amp = pow(0.5, 3.0-0.0);
  t += ${varName}_valueNoise(vec2<f32>(UV.x*Scale/freq, UV.y*Scale/freq))*amp;

  freq = pow(2.0, 1.0);
  amp = pow(0.5, 3.0-1.0);
  t += ${varName}_valueNoise(vec2<f32>(UV.x*Scale/freq, UV.y*Scale/freq))*amp;

  freq = pow(2.0, 2.0);
  amp = pow(0.5, 3.0-2.0);
  t += ${varName}_valueNoise(vec2<f32>(UV.x*Scale/freq, UV.y*Scale/freq))*amp;

  return t;
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${scaleVar});`,
    };
  }
}
