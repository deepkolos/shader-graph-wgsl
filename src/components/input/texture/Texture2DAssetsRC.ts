import { AssetControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, AssetValue } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteTexture2DAssetNode = ExtendReteNode<
  'Texture2DAsset',
  {
    outValue: AssetValue;
    outValueType: ValueType.texture2d;
  }
>;

export class Texture2DAssetRC extends RC {
  constructor() {
    super('Texture2DAsset');
    this.data.component = NodeView;
  }

  initNode(node: ReteTexture2DAssetNode) {
    const { data, meta } = node;
    node.initValueType('out', undefined, ValueType.texture2d);
    data.expanded ??= true;

    meta.previewDisabled = true;
    meta.category = 'input/texture';
    meta.label = 'Texture 2D Asset';
  }

  async builder(node: ReteTexture2DAssetNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.texture2d);

    node.addOutput(out).addControl(new AssetControl('out', node, this.editor!, false, ''));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTexture2DAssetNode>): SGNodeOutput {
    const outVar = compiler.compileValue(node.data.outValue, node.data.outValueType);
    return { outputs: { out: outVar }, code: '' };
  }
}
