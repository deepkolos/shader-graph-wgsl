import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSmoothnessBlock = ExtendReteNode<
  'SmoothnessBlock',
  {
    smoothnessValue: number;
    smoothnessValueType: ValueType.float;
  }
>;

export class SmoothnessBlock extends RCBlock {
  static Name = 'SmoothnessBlock';
  constructor() {
    super(SmoothnessBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteSmoothnessBlock) {
    const { data, meta } = node;
    node.initValueType('smoothness', 0.5, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Smoothness';
  }

  async builder(node: ReteSmoothnessBlock) {
    await this.initNode(node);
    const smoothness = new Rete.Input('smoothness', node.label, Sockets.float);

    smoothness.addControl(new FloatControl('smoothness', node));
    node.addInput(smoothness);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSmoothnessBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarCoverted(node, 'smoothness');
    return { outputs: {}, code: inVar ? `smoothness = ${inVar};` : '' };
  }
}
