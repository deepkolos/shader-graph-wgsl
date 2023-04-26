import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteAlphaClipBlock = ExtendReteNode<
  'AlphaClipBlock',
  {
    alphaValue: number;
    alphaValueType: ValueType.float;
  }
>;

export class AlphaClipBlock extends RCBlock {
  static Name = 'AlphaClipBlock';
  constructor() {
    super(AlphaClipBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteAlphaClipBlock) {
    const { data, meta } = node;
    node.initValueType('alpha', 0.5, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Alpha Clip Threshold';
  }

  async builder(node: ReteAlphaClipBlock) {
    await this.initNode(node);
    const alpha = new Rete.Input('alpha', node.label, Sockets.vec3);

    alpha.addControl(new FloatControl('alpha', node));
    node.addInput(alpha);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteAlphaClipBlock>): SGNodeOutput {
    // 要求先link alpha 再 link alpha clip
    const inVar = compiler.getInputVarCoverted(node, 'alpha');
    return { outputs: {}, code: inVar ? `if (*alpha < ${inVar}) { discard; }` : '' };
  }
}
