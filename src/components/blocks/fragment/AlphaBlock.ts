import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteAlphaBlock = ExtendReteNode<
  'AlphaBlock',
  {
    alphaValue: number;
    alphaValueType: ValueType.float;
  }
>;

export class AlphaBlock extends RCBlock {
  static Name = 'AlphaBlock';
  constructor() {
    super(AlphaBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteAlphaBlock) {
    const { data, meta } = node;
    node.initValueType('alpha', 1, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Alpha';
  }

  async builder(node: ReteAlphaBlock) {
    await this.initNode(node);
    const alpha = new Rete.Input('alpha', node.label, Sockets.vec3);

    alpha.addControl(new FloatControl('alpha', node));
    node.addInput(alpha);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteAlphaBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'alpha');
    return { outputs: {}, code: `*alpha = ${inVar};` };
  }
}
