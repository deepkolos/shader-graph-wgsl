import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, AssetValue, Rete } from '../../types';
import { NodeView, SelectControl, AssetControl, LabelControl, DynamicControl } from '../../view';
import { NormalRC, PositionRC, UVRC } from '../input';
import { RC } from '../ReteComponent';

export type ReteTriplanarNode = ExtendReteNode<
  'Triplanar',
  {
    textureValue: AssetValue;
    textureValueType: ValueType.texture2d;
    positionValue: number[];
    positionValueType: ValueType.vec3;
    normalValue: number[];
    normalValueType: ValueType.vec3;
    tileValue: number;
    tileValueType: ValueType.float;
    blendValue: number;
    blendValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec4;

    typeValue: 'default';
    // typeValue: 'default' | 'normal';
  }
>;

// const TypeOptions = ['default', 'normal'];
const TypeOptions = ['default']; // TODO normal support

export class TriplanarRC extends RC {
  constructor() {
    super('Triplanar');
    this.data.component = NodeView;
  }

  initNode(node: ReteTriplanarNode) {
    const { data, meta } = node;
    node.initValueType('texture', undefined, ValueType.texture2d);
    node.initValueType('sampler', undefined, ValueType.sampler);
    node.initValueType('position', [0, 0, 0], ValueType.vec3);
    node.initValueType('normal', [0, 0, 0], ValueType.vec3);
    node.initValueType('tile', 1, ValueType.float);
    node.initValueType('blend', 1, ValueType.float);
    node.initValueType('out', [0, 0, 0, 0], ValueType.vec4);
    node.initValueType('type', 'default', ValueType.string);

    data.expanded ??= true;
    data.previewType = '3d';

    meta.previewDisabled = false;
    data.preview ??= true;
    meta.category = 'UV';
  }

  async builder(node: ReteTriplanarNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('texture', 'Texture', Sockets.texture2d).addControl(new AssetControl('texture', node, this.editor!, true)))
      .addInput(new Rete.Input('sampler', 'Sampler', Sockets.sampler))
      .addInput(new Rete.Input('position', 'Position', Sockets.vec3).addControl(new LabelControl('position', node, 'World Space')))
      .addInput(new Rete.Input('normal', 'Normal', Sockets.vec3).addControl(new LabelControl('normal', node, 'World Space')))
      .addInput(new Rete.Input('tile', 'Tile', Sockets.float).addControl(new DynamicControl('tile', node)))
      .addInput(new Rete.Input('blend', 'Blend', Sockets.float).addControl(new DynamicControl('blend', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec4))
      .addControl(new SelectControl('type', node, 'Type', TypeOptions, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTriplanarNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'rgba', 'texColor');
    const textureVar = compiler.getInputVar(node, 'texture');
    const samplerVar = textureVar ? compiler.getInputVar(node, 'sampler') : '';
    let positionVar = compiler.getInputVarConverted(node, 'position', false);
    let normalVar = compiler.getInputVarConverted(node, 'normal', false);
    const [tileVar, blendVar] = compiler.getInputVarConvertedArray(node, ['tile', 'blend']);

    if (!positionVar) positionVar = PositionRC.initPositionContext(compiler, 'world');
    if (!normalVar) normalVar = NormalRC.initNormalContext(compiler, 'world');

    const type = node.data.typeValue;

    let fnVar = '';

    if (type === 'default') {
      const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(Texture: texture_2d<f32>, Position: vec3f, Normal: vec3f, Tile: f32, Blend: f32, Sampler: sampler) -> vec4f {
  let Node_UV = Position * Tile;
  var Node_Blend = pow(abs(Normal), vec3f(Blend));
  Node_Blend /= dot(Node_Blend, vec3f(1.0));
  let Node_X = textureSample(Texture, Sampler, Node_UV.zy);
  let Node_Y = textureSample(Texture, Sampler, Node_UV.xz);
  let Node_Z = textureSample(Texture, Sampler, Node_UV.xy);
  return Node_X * Node_Blend.x + Node_Y * Node_Blend.y + Node_Z * Node_Blend.z;
}`;
      fnVar = compiler.setContext('defines', node, type, codeFn);
    } else {
      // TODO 缺tangent
    }

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${
        textureVar ? `${fnVar}(${[textureVar, positionVar, normalVar, tileVar, blendVar, samplerVar].join(',')})` : 'vec4f(1.0)'
      };`,
    };
  }
}
