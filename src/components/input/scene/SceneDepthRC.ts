import { NodeView, SelectControl } from '../../../view';
import { Sockets } from '../../../sockets';
import {
  ValueType,
  Rete,
  ExtendReteNode,
  ScreenPositionModeValue,
  ScreenPositionModeOptions,
  ArrayElement,
  SamplerValue,
} from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { ScreenPositionRC } from '../geometry';

const ModeOptions = ['linear01', 'raw', 'eye'] as const;
type ModeValue = ArrayElement<typeof ModeOptions>;

export type ReteSceneDepthNode = ExtendReteNode<
  'SceneDepth',
  {
    uvValue: ScreenPositionModeValue | number[];
    uvValueType: ValueType.vec4;
    outValue: number;
    outValueType: ValueType.float;
    modeValue: ModeValue;
    modeValueType: ValueType.string;
  }
>;

export class SceneDepthRC extends RC {
  static Name = 'SceneDepth';
  constructor() {
    super(SceneDepthRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteSceneDepthNode) {
    const { data, meta } = node;
    node.initValueType('uv', ScreenPositionModeOptions[0], ValueType.vec4);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('mode', ModeOptions[0], ValueType.string);
    data.expanded ??= true;
    data.preview ??= true;

    meta.category = 'input/scene';
    meta.previewDisabled = false;
    meta.label = 'Scene Depth';
  }

  async builder(node: ReteSceneDepthNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', ScreenPositionModeOptions as any),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.float))
      .addControl(new SelectControl('mode', node, 'Sample Mode', ModeOptions as any, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSceneDepthNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'sceneDepth');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = ScreenPositionRC.initScreenPositionContext(compiler, 'default');

    const mode = node.data.modeValue;
    const samplerVar = compiler.compileValue(
      { filter: 'point', warp: 'clamp' } satisfies SamplerValue,
      ValueType.sampler,
    );
    const depthTextureVar = compiler.setContext(
      'bindings',
      node,
      'depthTexture',
      (varName, i) => `@group(0) @binding(${i}) var ${varName}: texture_depth_2d;`,
    );
    const zBufferParamVar = compiler.setContext(
      'uniforms',
      node,
      'zBufferParam',
      (varName: string) => `${varName}: vec4<f32>`,
    );

    if (mode === 'raw') {
      return {
        outputs: { out: outVar },
        code: `let ${outVar} = textureSample(${depthTextureVar}, ${samplerVar}, ${uvVar}.xy);`,
      };
    }

    let codeFn: (n: string) => string;
    if (mode === 'linear01') {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(depth: f32, zBufferParam: vec4f) -> f32 {
  return 1.0 / (zBufferParam.x * depth + zBufferParam.y);
}`;
    } else {
      codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(depth: f32, zBufferParam: vec4f) -> f32 {
  return 1.0 / (zBufferParam.z * depth + zBufferParam.w);
}`;
    }

    const fnVar = compiler.setContext('defines', node, mode, codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(textureSample(${depthTextureVar}, ${samplerVar}, ${uvVar}.xy), ${zBufferParamVar});`,
    };
  }
}
