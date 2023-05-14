import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteCoatMaskBlock = ExtendReteNode<
  'CoatMaskBlock',
  {
    CoatMaskValue: number;
    CoatMaskValueType: ValueType.float;
  }
>;

export class CoatMaskBlock extends RCBlock {
  static Name = 'CoatMaskBlock';
  constructor() {
    super(CoatMaskBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteCoatMaskBlock) {
    const { data, meta } = node;
    node.initValueType('CoatMask', 0, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Coat Mask';
  }

  async builder(node: ReteCoatMaskBlock) {
    await this.initNode(node);
    const CoatMask = new Rete.Input('CoatMask', node.label, Sockets.float);

    CoatMask.addControl(new FloatControl('CoatMask', node));
    node.addInput(CoatMask);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCoatMaskBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'CoatMask');
    return { outputs: {}, code: inVar ? `coatMask = ${inVar};` : '' };
  }
}
