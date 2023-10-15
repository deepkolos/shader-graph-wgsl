import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, ArrayElement } from '../../types';
import { NodeView, DynamicControl, SelectDualControl } from '../../view';
import { RC } from '../ReteComponent';

const ColorSpaceOptions = ['sRGB', 'Linear', 'HSV'] as const;
type ColorSpace = ArrayElement<typeof ColorSpaceOptions>;

export type ReteColorSpaceConversionNode = ExtendReteNode<
  'ColorSpaceConversion',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    fromValue: ColorSpace;
    fromValueType: ValueType.string;
    toValue: ColorSpace;
    toValueType: ValueType.string;
  }
>;

export class ColorSpaceConversionRC extends RC {
  static Name = 'ColorSpaceConversion';
  constructor() {
    super(ColorSpaceConversionRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteColorSpaceConversionNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('from', ColorSpaceOptions[0], ValueType.string);
    node.initValueType('to', ColorSpaceOptions[0], ValueType.string);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/utility';
    meta.label = 'Color Space Conversion';
  }

  async builder(node: ReteColorSpaceConversionNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3))
      .addControl(
        new SelectDualControl(
          node,
          'from',
          'to',
          ColorSpaceOptions as any,
          ColorSpaceOptions as any,
        ),
      );
  }

  static initFnContext(compiler: ShaderGraphCompiler, from: ColorSpace, to: ColorSpace) {
    const node = { name: ColorSpaceConversionRC.Name };
    let codeFn: (n: string) => string;
    if (from === 'sRGB' && to === 'HSV') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let P = mix(vec4<f32>(In.bg, K.wz), vec4<f32>(In.gb, K.xy), step(In.b, In.g));
    let Q = mix(vec4<f32>(P.xyw, In.r), vec4<f32>(In.r, P.yzx), step(P.x, In.r));
    let D = Q.x - min(Q.w, Q.y);
    let E = 1e-10;
    let V = (D == 0.0) ? Q.x : (Q.x + E);
    return vec3<f32>(abs(Q.z + (Q.w - Q.y)/(6.0 * D + E)), D / (Q.x + E), V);
}`;
    }
    if (from === 'sRGB' && to === 'Linear') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
  let linearRGBLo = In / 12.92;
  let linearRGBHi = pow(max(abs((In + 0.055) / 1.055), vec3f(1.192092896e-07)), vec3<f32>(2.4, 2.4, 2.4));
  let stepCheck = step(vec3f(0.04045), In);
  return stepCheck * linearRGBHi + (1.0 - stepCheck) * linearRGBLo;
}`;
    }

    if (from === 'HSV' && to === 'sRGB') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let P = abs(fract(In.xxx + K.xyz) * 6.0 - K.www);
  return In.z * mix(K.xxx, clamp(P - K.xxx, 0.0, 1.0), In.y);
}`;
    }
    if (from === 'HSV' && to === 'Linear') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let P = abs(fract(In.xxx + K.xyz) * 6.0 - K.www);
  let RGB = In.z * mix(K.xxx, clamp(P - K.xxx, 0.0, 1.0), In.y);
  let linearRGBLo = RGB / 12.92;
  let linearRGBHi = pow(max(abs((RGB + 0.055) / 1.055), 1.192092896e-07), vec3<f32>(2.4, 2.4, 2.4));
  let stepCheck = step(0.04045, In);
  return stepCheck * linearRGBHi + (1.0 - stepCheck) * linearRGBLo;
}`;
    }

    if (from === 'Linear' && to === 'sRGB') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
  let sRGBLo = In * 12.92;
  let sRGBHi = (pow(max(abs(In), vec3f(1.192092896e-07)), vec3<f32>(1.0 / 2.4, 1.0 / 2.4, 1.0 / 2.4)) * 1.055) - 0.055;
  let stepCheck = step(vec3f(0.0031308), In);
  return stepCheck * sRGBHi + (1.0 - stepCheck) * sRGBLo;
}`;
    }
    if (from === 'Linear' && to === 'HSV') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>) -> vec3<f32> {
    let sRGBLo = In * 12.92;
    let sRGBHi = (pow(max(abs(In), 1.192092896e-07), vec3<f32>(1.0 / 2.4, 1.0 / 2.4, 1.0 / 2.4)) * 1.055) - 0.055;
    let stepCheck = step(vec3f(0.0031308), In);
    let Linear = stepCheck * sRGBHi + (1.0 - stepCheck) * sRGBLo;
    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let P = mix(vec4<f32>(Linear.bg, K.wz), vec4<f32>(Linear.gb, K.xy), step(Linear.b, Linear.g));
    let Q = mix(vec4<f32>(P.xyw, Linear.r), vec4<f32>(Linear.r, P.yzx), step(P.x, Linear.r));
    let D = Q.x - min(Q.w, Q.y);
    let E = 1e-10;
    return vec3<f32>(abs(Q.z + (Q.w - Q.y)/(6.0 * D + E)), D / (Q.x + E), Q.x);
}`;
    }

    const fnVar = compiler.setContext('defines', node, from + '_' + to, codeFn!);
    return fnVar;
  }

  compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteColorSpaceConversionNode>,
  ): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'contrast');
    const inVar = compiler.getInputVarConverted(node, 'in');
    const from = node.data.fromValue;
    const to = node.data.toValue;

    if (from === to) return { outputs: { out: inVar }, code: '' };

    const fnVar = ColorSpaceConversionRC.initFnContext(compiler, from, to);
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${inVar});`,
    };
  }
}
