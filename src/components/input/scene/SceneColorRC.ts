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
import { SamplerStateRC } from '../texture';

export type ReteSceneColorNode = ExtendReteNode<
  'SceneColor',
  {
    uvValue: ScreenPositionModeValue | number[];
    uvValueType: ValueType.vec4;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class SceneColorRC extends RC {
  static Name = 'SceneColor';
  constructor() {
    super(SceneColorRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteSceneColorNode) {
    const { data, meta } = node;
    node.initValueType('uv', ScreenPositionModeOptions[0], ValueType.vec4);
    node.initValueType('out', [0, 0, 0, 0], ValueType.vec4);
    data.expanded ??= true;
    data.preview ??= true;

    meta.category = 'input/scene';
    meta.previewDisabled = false;
    meta.label = 'Scene Color';
  }

  async builder(node: ReteSceneColorNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', ScreenPositionModeOptions as any),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSceneColorNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'sceneColor');
    const colorTextureVar = compiler.setContext(
      'bindings',
      node,
      'colorTexture',
      (varName, i) => `@group(0) @binding(${i}) var ${varName}: texture_2d<f32>;`,
    );
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    const samplerVar = compiler.compileValue(
      { filter: 'point', warp: 'clamp' } satisfies SamplerValue,
      ValueType.sampler,
    );
    if (!uvVar) uvVar = ScreenPositionRC.initScreenPositionContext(compiler, 'default');

    return {
      outputs: { out: outVar },
      code: /* wgsl */ `let ${outVar} = textureSample(${colorTextureVar}, ${samplerVar}, ${uvVar}.xy);`,
    };
  }
}
