import { AssetControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, AssetValue } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteTexelSizeNode = ExtendReteNode<
  'TexelSize',
  {
    textureValue: AssetValue;
    textureValueType: ValueType.texture2d;
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
  }
>;

export class TexelSizeRC extends RC {
  constructor() {
    super('TexelSize');
    this.data.component = NodeView;
  }

  initNode(node: ReteTexelSizeNode) {
    const { data, meta } = node;
    node.initValueType('texture', undefined, ValueType.texture2d);
    node.initValueType('width', 0, ValueType.float);
    node.initValueType('height', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = true;
    meta.category = 'input/texture';
    meta.label = 'Texel Size';
  }

  async builder(node: ReteTexelSizeNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('texture', 'Texture', Sockets.texture2d).addControl(
          new AssetControl('texture', node, this.editor!),
        ),
      )
      .addOutput(new Rete.Output('width', 'Width', Sockets.float))
      .addOutput(new Rete.Output('height', 'Height', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTexelSizeNode>): SGNodeOutput {
    // let widthVar = '0.0';
    // let heightVar = '0.0';
    // const textureVar = compiler.getInputVar(node, 'texture');

    // if (textureVar) {
    //   const sizeVar = compiler.setContext('uniforms', node, textureVar + '_size', varName => `${varName}: vec2<f32>`);
    //   widthVar = sizeVar + '.x';
    //   heightVar = sizeVar + '.y';
    // }

    // return { outputs: { width: widthVar, height: heightVar }, code: '' };

    const dimVar = compiler.getOutVarName(node, 'width');
    const textureVar = compiler.getInputVar(node, 'texture');

    if (!textureVar) return { outputs: { width: '0.0', height: '0.0' }, code: '' };

    return {
      outputs: { width: `${dimVar}.x`, height: `${dimVar}.y` },
      code: `let ${dimVar} = textureDimensions(${textureVar});`,
    };
  }
}
