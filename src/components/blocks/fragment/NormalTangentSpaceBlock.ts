import { LabelControl, BlockView } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteNormalTSBlock = ExtendReteNode<
  'NormalTSBlock',
  {
    normalValue: number[];
    normalValueType: ValueType.vec3;
  }
>;

export class NormalTangentSpaceBlock extends RCBlock {
  static Name = 'NormalTSBlock';
  constructor() {
    super(NormalTangentSpaceBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteNormalTSBlock) {
    const { data, meta } = node;
    node.initValueType('normal', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Normal (Tangent Space)';
  }

  async builder(node: ReteNormalTSBlock) {
    await this.initNode(node);
    const position = new Rete.Input('normal', node.label, Sockets.vec3);

    position.addControl(new LabelControl('normal', node, 'Tangent Space'));
    node.addInput(position);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalTSBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'normal');
    return { outputs: {}, code: inVar ? `normalTS = ${inVar};` : '' };
  }
}
