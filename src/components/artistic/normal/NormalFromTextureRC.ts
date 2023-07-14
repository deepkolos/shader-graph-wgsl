import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { AssetValue, ExtendReteNode, Rete, UVOptions, UVValue, ValueType } from '../../../types';
import { NodeView, SelectControl, AssetControl, DynamicControl } from '../../../view';
import { UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteNormalFromTextureNode = ExtendReteNode<
  'NormalFromTexture',
  {
    textureValue: AssetValue;
    textureValueType: ValueType.texture2d;
    uvValue: UVValue;
    uvValueType: ValueType.vec2;
    offsetValue: number;
    offsetValueType: ValueType.float;
    strengthValue: number;
    strengthValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class NormalFromTextureRC extends RC {
  constructor() {
    super('NormalFromTexture');
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalFromTextureNode) {
    const { data, meta } = node;
    node.initValueType('texture', undefined, ValueType.texture2d);
    node.initValueType('uv', UVOptions[0], ValueType.vec2);
    node.initValueType('offset', 0.5, ValueType.float);
    node.initValueType('strength', 8, ValueType.float);
    node.initValueType('sampler', undefined, ValueType.sampler);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);

    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/normal';
    meta.label = 'Normal From Texture';
  }

  async builder(node: ReteNormalFromTextureNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('texture', 'Texture', Sockets.texture2d).addControl(
          new AssetControl('texture', node, this.editor!, true),
        ),
      )
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', UVOptions as any, true),
        ),
      )
      .addInput(new Rete.Input('sampler', 'Sampler', Sockets.sampler))
      .addInput(
        new Rete.Input('offset', 'Offset', Sockets.float).addControl(
          new DynamicControl('offset', node),
        ),
      )
      .addInput(
        new Rete.Input('strength', 'Strength', Sockets.float).addControl(
          new DynamicControl('strength', node),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteNormalFromTextureNode>,
  ): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'normalFromTex');
    const textureVar = compiler.getInputVar(node, 'texture');
    const samplerVar = textureVar ? compiler.getInputVar(node, 'sampler') : '';
    const [offsetVar, strengthVar] = compiler.getInputVarConvertedArray(node, [
      'offset',
      'strength',
    ]);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(Texture: texture_2d<f32>, UV: vec2f, Offset_: f32, Strength: f32, Sampler: sampler) -> vec3f {
  let Offset = pow(Offset_, 3.) * 0.1;
  let offsetU = vec2f(UV.x + Offset, UV.y);
  let offsetV = vec2f(UV.x, UV.y + Offset);
  let normalSample = textureSample(Texture, Sampler, UV).r;
  let uSample = textureSample(Texture, Sampler, offsetU).r;
  let vSample = textureSample(Texture, Sampler, offsetV).r;
  let va = vec3f(1., 0., (uSample - normalSample) * Strength);
  let vb = vec3f(0., 1., (vSample - normalSample) * Strength);
  return normalize(cross(va, vb));
}
`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${
        textureVar
          ? `${fnVar}(${textureVar}, ${uvVar}, ${offsetVar}, ${strengthVar}, ${samplerVar})`
          : 'vec3f(0, 0, 1)'
      };`,
    };
  }
}
