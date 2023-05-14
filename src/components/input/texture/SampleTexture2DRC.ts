import { AssetControl, NodeView, SelectControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, AssetValue } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { UVRC } from '../geometry';

export type ReteSampleTexture2DNode = ExtendReteNode<
  'SampleTexture2D',
  {
    rgbaValue: number[];
    rgbaValueType: ValueType.vec4;
    rValue: number;
    rValueType: ValueType.float;
    gValue: number;
    gValueType: ValueType.float;
    bValue: number;
    bValueType: ValueType.float;
    aValue: number;
    aValueType: ValueType.float;

    textureValue: AssetValue;
    textureValueType: ValueType.texture2d;
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3';
    uvValueType: ValueType.vec2;

    typeValue: 'default' | 'normal';
    spaceValue: 'object' | 'tangent';
  }
>;

export class SampleTexture2DRC extends RC {
  constructor() {
    super('SampleTexture2D');
    this.data.component = NodeView;
  }

  initNode(node: ReteSampleTexture2DNode) {
    const { data, meta } = node;
    node.initValueType('rgba', [0, 0, 0, 0], ValueType.vec4);
    node.initValueType('r', 0, ValueType.float);
    node.initValueType('g', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('texture', undefined, ValueType.texture2d);
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('sampler', undefined, ValueType.sampler);
    node.initValueType('type', 'default', ValueType.string);
    node.initValueType('space', 'object', ValueType.string);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'input/texture';
    meta.label = 'Sample Texture 2D';
  }

  async builder(node: ReteSampleTexture2DNode) {
    this.initNode(node);
    const rgba = new Rete.Output('rgba', 'RGBA', Sockets.vec4);
    const r = new Rete.Output('r', 'R', Sockets.float);
    const g = new Rete.Output('g', 'G', Sockets.float);
    const b = new Rete.Output('a', 'B', Sockets.float);
    const a = new Rete.Output('b', 'A', Sockets.float);
    [rgba, r, g, b, a].forEach(o => node.addOutput(o));

    const texture = new Rete.Input('texture', 'Texture', Sockets.texture2d);
    const uv = new Rete.Input('uv', 'UV', Sockets.vec2);
    const sampler = new Rete.Input('sampler', 'Sampler', Sockets.sampler);
    [texture, uv, sampler].forEach(i => node.addInput(i));
    uv.addControl(new SelectControl('uv', node, '', ['UV0', 'UV1', 'UV2', 'UV3'], true));
    texture.addControl(new AssetControl('texture', node, this.editor!, true));
    node.addControl(new SelectControl('type', node, 'Type', ['default', 'normal'], false));
    node.addControl(new SelectControl('space', node, 'Space', ['object', 'tangent'], false));
  }

  compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteSampleTexture2DNode>,
  ): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'rgba', 'texColor');
    const textureVar = compiler.getInputVar(node, 'texture');
    const samplerVar = textureVar ? compiler.getInputVar(node, 'sampler') : '';
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    // TODO type space
    return {
      outputs: {
        rgba: outVar,
        r: `${outVar}.r`,
        g: `${outVar}.g`,
        b: `${outVar}.b`,
        a: `${outVar}.a`,
      },
      code: `let ${outVar} = ${
        textureVar ? `textureSample(${textureVar}, ${samplerVar}, ${uvVar})` : 'vec4<f32>(0)'
      };`,
    };
  }
}
