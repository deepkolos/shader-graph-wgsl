import { LabelControl, BlockView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteNormalBlock = ExtendReteNode<
  'NormalBlock',
  {
    normalValue: number[];
    normalValueType: ValueType.vec3;
  }
>;

export class NormalBlock extends RCBlock {
  static Name = 'NormalBlock';
  constructor() {
    super(NormalBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteNormalBlock) {
    const { data, meta } = node;
    node.initValueType('normal', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Normal';
  }

  async builder(node: ReteNormalBlock) {
    await this.initNode(node);
    const position = new Rete.Input('normal', node.label, Sockets.vec3);

    position.addControl(new LabelControl('normal', node, 'Object Space'));
    node.addInput(position);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarCoverted(node, 'normal', false);
    return { outputs: {}, code: inVar ? `*normalOS = ${inVar};` : '' };
  }
}
