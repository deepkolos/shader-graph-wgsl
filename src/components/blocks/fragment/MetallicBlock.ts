import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ReteNode, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteMetallicBlock = ExtendReteNode<
  'MetallicBlock',
  {
    metallicValue: number;
    metallicValueType: ValueType.float;
  }
>;

export class MetallicBlock extends RCBlock {
  static Name = 'MetallicBlock';
  constructor() {
    super(MetallicBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteMetallicBlock) {
    const { data, meta } = node;
    node.initValueType('metallic', 0, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Metallic';
  }

  async builder(node: ReteMetallicBlock) {
    await this.initNode(node);
    const metallic = new Rete.Input('metallic', node.label, Sockets.float);

    metallic.addControl(new FloatControl('metallic', node));
    node.addInput(metallic);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteMetallicBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'metallic');
    return { outputs: {}, code: inVar ? `metallic = ${inVar};` : '' };
  }
}
