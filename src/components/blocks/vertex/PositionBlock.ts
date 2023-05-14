import { LabelControl, BlockView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData, SGNodes } from '../../../editors';

export type RetePositionBlock = ExtendReteNode<
  'PositionBlock',
  {
    positionValue: number[];
    positionValueType: ValueType.vec3;
  }
>;

export class PositionBlock extends RCBlock {
  static Name = 'PositionBlock';
  constructor() {
    super(PositionBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: RetePositionBlock) {
    const { data, meta } = node;
    node.initValueType('position', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Position';
  }

  async builder(node: RetePositionBlock) {
    await this.initNode(node);
    const position = new Rete.Input('position', node.label, Sockets.vec3);

    position.addControl(new LabelControl('position', node, 'Object Space'));
    node.addInput(position);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<SGNodes>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'position', false);
    return { outputs: {}, code: inVar ? `*positionOS = ${inVar};` : '' };
  }
}
