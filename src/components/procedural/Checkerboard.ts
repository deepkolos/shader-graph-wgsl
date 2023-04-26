import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../types';
import { NodeView, SelectControl, ColorControl, DynamicControl } from '../../view';
import { UVRC } from '../input';
import { RC } from '../ReteComponent';

export type ReteCheckerboardNode = ExtendReteNode<
  'Checkerboard',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    colorAValue: number[];
    colorAValueType: ValueType.vec3;
    colorBValue: number[];
    colorBValueType: ValueType.vec3;
    frequencyValue: number[];
    frequencyValueType: ValueType.vec2;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class CheckerboardRC extends RC {
  constructor() {
    super('Checkerboard');
    this.data.component = NodeView;
  }

  initNode(node: ReteCheckerboardNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('colorA', [0, 0.98, 1], ValueType.vec3);
    node.initValueType('colorB', [0.62, 0.58, 1], ValueType.vec3);
    node.initValueType('frequency', [1, 1], ValueType.vec2);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural';
  }

  async builder(node: ReteCheckerboardNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('colorA', 'Color A', Sockets.vec3).addControl(new ColorControl('colorA', node)))
      .addInput(new Rete.Input('colorB', 'Color B', Sockets.vec3).addControl(new ColorControl('colorB', node)))
      .addInput(new Rete.Input('frequency', 'Frequency', Sockets.vec2).addControl(new DynamicControl('frequency', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCheckerboardNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'checker');
    const colorAVar = compiler.getInputVarCoverted(node, 'colorA');
    const colorBVar = compiler.getInputVarCoverted(node, 'colorB');
    const frequencyVar = compiler.getInputVarCoverted(node, 'frequency');
    let uvVar = compiler.getInputVarCoverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV_: vec2<f32>, ColorA: vec3<f32>, ColorB: vec3<f32>, Frequency: vec2<f32>) -> vec3<f32> {
  let UV = (UV_.xy + 0.5) * Frequency;
  let derivatives = vec4<f32>(dpdx(UV), dpdy(UV));
  let duv_length = sqrt(vec2<f32>(dot(derivatives.xz, derivatives.xz), dot(derivatives.yw, derivatives.yw)));
  let width = 1.0;
  let distance3 = 4.0 * abs(fract(UV + 0.25) - 0.5) - width;
  let scale = 0.35 / duv_length.xy;
  let freqLimiter = sqrt(clamp(1.1f - max(duv_length.x, duv_length.y), 0.0, 1.0));
  let vector_alpha = clamp(distance3 * scale.xy, vec2<f32>(-1.0), vec2<f32>(1.0));
  let alpha = clamp(0.5f + 0.5f * vector_alpha.x * vector_alpha.y * freqLimiter, 0.0, 1.0);
  return mix(ColorA, ColorB, alpha);
}`;
    const fnVar = compiler.setContext('defineFns', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${colorAVar}, ${colorBVar}, ${frequencyVar});`,
    };
  }
}
