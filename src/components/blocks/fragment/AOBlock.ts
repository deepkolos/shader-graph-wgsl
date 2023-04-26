import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteAOBlock = ExtendReteNode<
  'AOBlock',
  {
    aoValue: number;
    aoValueType: ValueType.float;
  }
>;

export class AOBlock extends RCBlock {
  static Name = 'AOBlock';
  constructor() {
    super(AOBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteAOBlock) {
    const { data, meta } = node;
    node.initValueType('ao', 0, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Ambient Occlusion';
  }

  async builder(node: ReteAOBlock) {
    await this.initNode(node);
    const ao = new Rete.Input('ao', node.label, Sockets.float);

    ao.addControl(new FloatControl('ao', node));
    node.addInput(ao);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteAOBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarCoverted(node, 'ao');
    return { outputs: {}, code: inVar ? `ao = ${inVar};` : '' };
  }
}
